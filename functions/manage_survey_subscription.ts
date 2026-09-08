import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import SlackUserProfilesDatastore from "../datastores/slack_user_profiles.ts";
import { getNextSurveyEnabled } from "../utils/survey_subscription.ts";

export const ManageSurveySubscriptionFunction = DefineFunction({
  callback_id: "manage_survey_subscription",
  title: "体調アンケートの定期配信設定を切り替え",
  description: "実行したユーザー自身の定期配信設定を反転します",
  source_file: "functions/manage_survey_subscription.ts",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "設定を変更するSlackユーザー",
      },
    },
    required: ["user_id"],
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

    if (!existingResponse.ok) {
      return {
        error:
          `現在の定期配信設定を取得できませんでした: ${existingResponse.error}`,
      };
    }

    const now = Math.floor(Date.now() / 1_000);
    const existing = existingResponse.item;
    const surveyEnabled = getNextSurveyEnabled(existing?.survey_enabled);
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
        survey_enabled: surveyEnabled,
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

    const confirmationText = surveyEnabled
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
        survey_enabled: surveyEnabled,
      },
    };
  },
);
