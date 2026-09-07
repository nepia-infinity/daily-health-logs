import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import SlackUserProfilesDatastore from "../datastores/slack_user_profiles.ts";

export const ManageSurveySubscriptionFunction = DefineFunction({
  callback_id: "manage_survey_subscription",
  title: "体調アンケートの定期配信設定を更新",
  description: "実行したユーザー自身の定期配信設定を更新します",
  source_file: "functions/manage_survey_subscription.ts",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "設定を変更するSlackユーザー",
      },
      survey_enabled: {
        type: Schema.types.boolean,
        description: "定期配信を有効にするか",
      },
    },
    required: ["user_id", "survey_enabled"],
  },
  output_parameters: {
    properties: {
      survey_enabled: {
        type: Schema.types.boolean,
        description: "更新後の定期配信設定",
      },
    },
    required: ["survey_enabled"],
  },
});

export default SlackFunction(
  ManageSurveySubscriptionFunction,
  async ({ inputs, client }) => {
    const conversationResponse = await client.conversations.open({
      users: inputs.user_id,
    });
    const dmChannelId = conversationResponse.channel?.id;

    if (!conversationResponse.ok || !dmChannelId) {
      return {
        error: `DMチャンネルを取得できませんでした: ${
          conversationResponse.error ?? "unknown_error"
        }`,
      };
    }

    const [existingResponse, userResponse] = await Promise.all([
      client.apps.datastore.get<typeof SlackUserProfilesDatastore.definition>({
        datastore: SlackUserProfilesDatastore.name,
        id: inputs.user_id,
      }),
      client.users.info({ user: inputs.user_id }),
    ]);

    const now = Math.floor(Date.now() / 1_000);
    const existing = existingResponse.ok ? existingResponse.item : undefined;
    const profile = userResponse.ok ? userResponse.user?.profile : undefined;
    const screenName = profile?.display_name_normalized ||
      profile?.display_name ||
      profile?.real_name_normalized ||
      profile?.real_name ||
      existing?.screen_name ||
      "Slack member";

    const updateResponse = await client.apps.datastore.update<
      typeof SlackUserProfilesDatastore.definition
    >({
      datastore: SlackUserProfilesDatastore.name,
      item: {
        slack_member_id: inputs.user_id,
        screen_name: screenName,
        survey_enabled: inputs.survey_enabled,
        dm_channel_id: dmChannelId,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      },
    });

    if (!updateResponse.ok) {
      return {
        error: `定期配信設定を保存できませんでした: ${updateResponse.error}`,
      };
    }

    const confirmationText = inputs.survey_enabled
      ? ":white_check_mark: 体調アンケートの定期配信を開始しました。"
      : ":white_check_mark: 体調アンケートの定期配信を停止しました。";
    const confirmationResponse = await client.chat.postMessage({
      channel: dmChannelId,
      text: confirmationText,
    });

    if (!confirmationResponse.ok) {
      console.error(JSON.stringify({
        event: "survey_subscription_confirmation_failed",
        error: confirmationResponse.error ?? "unknown_error",
      }));
    }

    return {
      outputs: {
        survey_enabled: inputs.survey_enabled,
      },
    };
  },
);
