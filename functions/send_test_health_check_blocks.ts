// functions/send_test_health_check_blocks.ts

import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { healthCheckBlocks } from "../blocks/daily_health_check_blocks.ts";

/**
 * 体調チェックBlock KitをSlack AppからDMでテスト送信するFunction
 *
 * blocks/daily_health_check_blocks.ts で生成したBlock Kitを読み込み、
 * 指定したSlackユーザーにDMで送信します。
 */
export const SendTestHealthCheckBlocksFunction = DefineFunction({
  callback_id: "send_test_health_check_blocks",
  title: "体調チェックBlock Kitをテスト送信",
  description: "生成済みのBlock KitをSlack AppからDMでテスト送信します",
  source_file: "functions/send_test_health_check_blocks.ts",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "DM送信先のSlackユーザー",
      },
    },
    required: ["user_id"],
  },
  output_parameters: {
    properties: {},
    required: [],
  },
});

export default SlackFunction(
  SendTestHealthCheckBlocksFunction,
  async ({ inputs, client }) => {
    const response = await client.chat.postMessage({
      channel: inputs.user_id,
      text: "今日の体調チェックです。",
      blocks: healthCheckBlocks,
    });

    if (!response.ok) {
      return {
        error: `体調チェックBlock KitのDM送信に失敗しました: ${response.error}`,
      };
    }

    return {
      completed: false,
    };
  },
).addBlockActionsHandler(
  [
    "action_meal",
    "action_sleep",
    "action_condition",
    "action_work_style",
    "action_medication",
    "action_depression",
    "submit_survey",
    "cancel_survey",
  ],
  async ({ action, body, client }) => {
    console.log("Block Kit action received:");
    console.log(JSON.stringify(action, null, 2));

    const channelId = body.channel?.id;
    const messageTs = body.message?.ts;

    if (!channelId || !messageTs) {
      return {
        error: "channel_id または message_ts が取得できませんでした。",
      };
    }

    if (action.action_id === "cancel_survey") {
      const updateResponse = await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: "体調チェックをキャンセルしました。",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "体調チェックをキャンセルしました。",
            },
          },
        ],
      });

      if (!updateResponse.ok) {
        return {
          error: `メッセージ更新に失敗しました: ${updateResponse.error}`,
        };
      }

      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {},
      });

      return;
    }

    if (action.action_id === "submit_survey") {
      const updateResponse = await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: "体調チェックを送信しました。",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "体調チェックを送信しました。",
            },
          },
        ],
      });

      if (!updateResponse.ok) {
        return {
          error: `メッセージ更新に失敗しました: ${updateResponse.error}`,
        };
      }

      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {},
      });

      return;
    }

    // radio_buttons の選択時は、まだ送信完了にはしない
    return {
      completed: false,
    };
  },
);
