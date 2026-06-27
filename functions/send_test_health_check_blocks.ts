import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { healthCheckBlocks } from "../blocks/daily_health_check_blocks.ts";
import { buildSubmissionCompletionBlocks } from "../blocks/submission_completion_blocks.ts";

type SelectedOptionAction = {
  selected_option?: {
    value?: string;
  };
};

type BlockStateValues = Record<string, Record<string, SelectedOptionAction>>;

function getSelectedValue(
  values: BlockStateValues,
  actionId: string,
): string {
  for (const actions of Object.values(values)) {
    const action = actions[actionId];

    if (action?.selected_option?.value) {
      return action.selected_option.value;
    }
  }

  return "";
}

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
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "回答したSlackユーザーのID",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "体調チェックメッセージが投稿されたチャンネルID",
      },
      message_ts: {
        type: Schema.slack.types.message_ts,
        description: "体調チェックメッセージのタイムスタンプ",
      },
      meal: {
        type: Schema.types.string,
        description: "食事の回答",
      },
      sleep: {
        type: Schema.types.string,
        description: "睡眠の回答",
      },
      condition: {
        type: Schema.types.string,
        description: "体調の回答",
      },
      work_style: {
        type: Schema.types.string,
        description: "就業スタイルの回答",
      },
      medication: {
        type: Schema.types.string,
        description: "服薬の回答",
      },
      depression: {
        type: Schema.types.string,
        description: "気分の落ち込みの回答",
      },
    },
    required: [
      "user_id",
      "channel_id",
      "message_ts",
      "meal",
      "sleep",
      "condition",
      "work_style",
      "medication",
      "depression",
    ],
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
      // ラジオボタン押下内容を取得する
      const values = body.state?.values ?? {};
      const meal = getSelectedValue(values, "action_meal");
      const sleep = getSelectedValue(values, "action_sleep");
      const condition = getSelectedValue(values, "action_condition");
      const workStyle = getSelectedValue(values, "action_work_style");
      const medication = getSelectedValue(values, "action_medication");
      const depression = getSelectedValue(values, "action_depression");

      // ボタン押下時のBlocksを呼び出す
      const submissionCompletionBlocks = buildSubmissionCompletionBlocks();

      // ボタン押下時にアンケート内容を書き替える
      const updateResponse = await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: "体調チェックを送信しました。",
        blocks: submissionCompletionBlocks,
      });

      if (!updateResponse.ok) {
        return {
          error: `メッセージ更新に失敗しました: ${updateResponse.error}`,
        };
      }

      // 次のステップへ渡す値をここで定義
      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {
          user_id: body.user.id,
          channel_id: channelId,
          message_ts: messageTs,
          meal,
          sleep,
          condition,
          work_style: workStyle,
          medication,
          depression,
        },
      });

      return;
    }

    // radio_buttons の選択時は、まだ送信完了にはしない
    return {
      completed: false,
    };
  },
);
