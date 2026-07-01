import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { healthCheckBlocks } from "../blocks/daily_health_check_blocks.ts";
import { buildSubmissionCompletionBlocks } from "../blocks/submission_completion_blocks.ts";
import { DateUtils } from "../utils/date_utils.ts";
import { fetchUserTimeZone } from "../utils/fetch_slack_user_info.ts";

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
  callback_id: "test_send_health_check_blocks",
  title: "体調チェックBlock Kitをテスト送信",
  description: "生成済みのBlock KitをSlack AppからDMでテスト送信します",
  source_file: "functions/test_send_health_check_blocks.ts",
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
      record_date: {
        type: Schema.types.string,
        description: "記録日",
      },
      week_start_date: {
        type: Schema.types.string,
        description: "週開始日",
      },
      day_of_week: {
        type: Schema.types.string,
        description: "曜日",
      },
      created_at: {
        type: Schema.types.string,
        description: "作成日時",
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
      "record_date",
      "week_start_date",
      "day_of_week",
      "created_at",
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

    // console.log("=== Body Data ===");
    // console.log(JSON.stringify(body, null, 2));

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
              text: ":warning: 体調チェックをキャンセルしました。",
            },
          },
        ],
      });

      if (!updateResponse.ok) {
        return {
          error: `メッセージ更新に失敗しました: ${updateResponse.error}`,
        };
      }

      return {
        completed: false,
      };
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

      // ユーザーのtimezoneを取得する
      const userTz = await fetchUserTimeZone(client, body.user.id);
      const dateUtils = new DateUtils(userTz);
      const now = new Date();

      const dayOfWeek = dateUtils.getDayOfWeek(now);
      const recordDate = dateUtils.formatDate(now);
      const weekStartDate = dateUtils.getWeekStartDate(now);
      const createdAt = now.toISOString();

      // ボタン押下時のBlocksを呼び出す
      const submissionCompletionBlocks = await buildSubmissionCompletionBlocks(
        {
          depression: depression,
          dayOfWeek: dayOfWeek,
          medication: medication,
          dateUtils,
          now,
          userId: body.user.id,
        },
        client,
      );

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
      // 引数を変更する際は、save_raw-data.ts, workflows/test_workflows.tsの修正が必要
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
          record_date: recordDate,
          week_start_date: weekStartDate,
          day_of_week: dayOfWeek,
          created_at: createdAt,
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
