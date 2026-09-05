import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { scheduledHealthCheckReminderBlocks } from "../blocks/scheduled_health_check_reminder_blocks.ts";
import {
  DELIVERY_BATCH_DELAY_MS,
  DELIVERY_BATCH_SIZE,
  DELIVERY_MAX_ATTEMPTS,
  DELIVERY_TIME_ZONE,
} from "../config/delivery.ts";
import SlackUserProfilesDatastore from "../datastores/slack_user_profiles.ts";
import { DateUtils } from "../utils/date_utils.ts";
import { chunkItems } from "../utils/delivery.ts";

type SlackUserProfile = {
  slack_member_id: string;
  survey_enabled?: boolean;
  dm_channel_id?: string;
  last_delivery_date?: string;
  [key: string]: unknown;
};

type DeliveryResult =
  | {
    ok: true;
    profile: SlackUserProfile;
    dmChannelId: string;
  }
  | {
    ok: false;
    profile: SlackUserProfile;
    error: string;
  };

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function getRetryAfterMs(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as {
    status?: unknown;
    headers?: { get?: (name: string) => string | null };
  };
  if (candidate.status !== 429) {
    return undefined;
  }

  const retryAfter = candidate.headers?.get?.("retry-after");
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  return Number.isFinite(seconds) ? Math.max(seconds, 1) * 1_000 : 1_000;
}

async function sendReminder(
  client: SlackAPIClient,
  profile: SlackUserProfile,
  triggerUrl: string,
): Promise<DeliveryResult> {
  const channel = profile.dm_channel_id || profile.slack_member_id;

  for (let attempt = 1; attempt <= DELIVERY_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await client.chat.postMessage({
        channel,
        text: "今日の体調チェックをお願いします。",
        blocks: scheduledHealthCheckReminderBlocks(triggerUrl),
      });

      if (response.ok) {
        return {
          ok: true,
          profile,
          dmChannelId: response.channel,
        };
      }

      if (
        response.error === "ratelimited" &&
        attempt < DELIVERY_MAX_ATTEMPTS
      ) {
        await wait(attempt * 1_000);
        continue;
      }

      return {
        ok: false,
        profile,
        error: response.error ?? "unknown_error",
      };
    } catch (error) {
      const retryAfterMs = getRetryAfterMs(error);
      if (retryAfterMs !== undefined && attempt < DELIVERY_MAX_ATTEMPTS) {
        await wait(retryAfterMs);
        continue;
      }

      return {
        ok: false,
        profile,
        error: error instanceof Error ? error.message : "unknown_error",
      };
    }
  }

  return {
    ok: false,
    profile,
    error: "retry_limit_exceeded",
  };
}

async function fetchEnabledProfiles(
  client: SlackAPIClient,
): Promise<SlackUserProfile[]> {
  const profiles: SlackUserProfile[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.apps.datastore.query<
      typeof SlackUserProfilesDatastore.definition
    >({
      datastore: SlackUserProfilesDatastore.name,
      expression: "#survey_enabled = :enabled",
      expression_attributes: {
        "#survey_enabled": "survey_enabled",
      },
      expression_values: {
        ":enabled": true,
      },
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });

    if (!response.ok) {
      throw new Error(response.error ?? "datastore_query_failed");
    }

    profiles.push(...response.items as SlackUserProfile[]);
    cursor = response.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return profiles;
}

async function saveDeliveryResults(
  client: SlackAPIClient,
  results: Array<Extract<DeliveryResult, { ok: true }>>,
  deliveryDate: string,
): Promise<void> {
  const updatedAt = Math.floor(Date.now() / 1_000);
  const items = results.map(({ profile, dmChannelId }) => ({
    ...profile,
    dm_channel_id: dmChannelId,
    last_delivery_date: deliveryDate,
    updated_at: updatedAt,
  }));

  for (const batch of chunkItems(items, 100)) {
    const response = await client.apps.datastore.bulkPut<
      typeof SlackUserProfilesDatastore.definition
    >({
      datastore: SlackUserProfilesDatastore.name,
      items: batch,
    });

    if (!response.ok || response.failed_items.length > 0) {
      console.error(JSON.stringify({
        event: "scheduled_delivery_status_update_failed",
        failed_count: response.ok ? response.failed_items.length : batch.length,
        error: response.error ?? "unknown_error",
      }));
    }
  }
}

export const SendScheduledHealthCheckRemindersFunction = DefineFunction({
  callback_id: "send_scheduled_health_check_reminders",
  title: "体調チェックを定期配信",
  description: "登録済みの参加者へ体調チェックの回答導線を一括送信します",
  source_file: "functions/send_scheduled_health_check_reminders.ts",
  output_parameters: {
    properties: {
      delivered_count: {
        type: Schema.types.number,
        description: "送信に成功した件数",
      },
      failed_count: {
        type: Schema.types.number,
        description: "送信に失敗した件数",
      },
      skipped_count: {
        type: Schema.types.number,
        description: "同日に送信済みのためスキップした件数",
      },
    },
    required: ["delivered_count", "failed_count", "skipped_count"],
  },
});

export default SlackFunction(
  SendScheduledHealthCheckRemindersFunction,
  async ({ client, env }) => {
    const triggerUrl = env.HEALTH_CHECK_TRIGGER_URL;
    if (!triggerUrl?.startsWith("https://slack.com/shortcuts/")) {
      return {
        error:
          "HEALTH_CHECK_TRIGGER_URLに体調チェック用リンクトリガーURLを設定してください。",
      };
    }

    let enabledProfiles: SlackUserProfile[];
    try {
      enabledProfiles = await fetchEnabledProfiles(client);
    } catch (error) {
      return {
        error: `配信対象を取得できませんでした: ${
          error instanceof Error ? error.message : "unknown_error"
        }`,
      };
    }

    const deliveryDate = new DateUtils(DELIVERY_TIME_ZONE).formatDate(
      new Date(),
    );
    const targets = enabledProfiles.filter((profile) =>
      profile.last_delivery_date !== deliveryDate
    );
    const skippedCount = enabledProfiles.length - targets.length;
    const results: DeliveryResult[] = [];
    const batches = chunkItems(targets, DELIVERY_BATCH_SIZE);

    for (const [index, batch] of batches.entries()) {
      results.push(
        ...await Promise.all(
          batch.map((profile) => sendReminder(client, profile, triggerUrl)),
        ),
      );

      if (index < batches.length - 1) {
        await wait(DELIVERY_BATCH_DELAY_MS);
      }
    }

    const delivered = results.filter(
      (result): result is Extract<DeliveryResult, { ok: true }> => result.ok,
    );
    const failed = results.filter((result) => !result.ok);

    if (delivered.length > 0) {
      await saveDeliveryResults(client, delivered, deliveryDate);
    }

    console.log(JSON.stringify({
      event: "scheduled_health_check_delivery_completed",
      delivered_count: delivered.length,
      failed_count: failed.length,
      skipped_count: skippedCount,
    }));

    return {
      outputs: {
        delivered_count: delivered.length,
        failed_count: failed.length,
        skipped_count: skippedCount,
      },
    };
  },
);
