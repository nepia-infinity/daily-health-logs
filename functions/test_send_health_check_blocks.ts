import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { healthCheckBlocks } from "../blocks/daily_health_check_blocks.ts";
import { submissionProgressBlocks } from "../blocks/submission_progress_blocks.ts";
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
      meal_status: {
        type: Schema.types.string,
        description: "食事状況の回答",
      },
      sleep_status: {
        type: Schema.types.string,
        description: "睡眠状況の回答",
      },
      condition: {
        type: Schema.types.string,
        description: "体調の回答",
      },
      work_style: {
        type: Schema.types.string,
        description: "就業スタイルの回答",
      },
      medication_status: {
        type: Schema.types.string,
        description: "服薬状況の回答",
      },
      low_mood_status: {
        type: Schema.types.string,
        description: "気分の落ち込みの有無",
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
      "meal_status",
      "sleep_status",
      "condition",
      "work_style",
      "medication_status",
      "low_mood_status",
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
    "action_medication_status",
    "action_low_mood_status",
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
      const mealStatus = getSelectedValue(values, "action_meal");
      const sleepStatus = getSelectedValue(values, "action_sleep");
      const condition = getSelectedValue(values, "action_condition");
      const workStyle = getSelectedValue(values, "action_work_style");
      const medicationStatus = getSelectedValue(
        values,
        "action_medication_status",
      );
      const lowMoodStatus = getSelectedValue(
        values,
        "action_low_mood_status",
      );

      // 送信ボタンを押した直後に、保存中メッセージへ切り替える
      const progressUpdateResponse = await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: "Datastoreに回答を保存しています...",
        blocks: submissionProgressBlocks,
      });

      // 表示の更新に失敗しても、回答データの保存処理は継続する
      if (!progressUpdateResponse.ok) {
        console.error(
          `保存中メッセージへの更新に失敗しました: ${progressUpdateResponse.error}`,
        );
      }

      // ユーザーのtimezoneを取得する
      const userTz = await fetchUserTimeZone(client, body.user.id);
      const dateUtils = new DateUtils(userTz);
      const now = new Date();

      const dayOfWeek = dateUtils.getDayOfWeek(now);
      const recordDate = dateUtils.formatDate(now);
      const weekStartDate = dateUtils.getWeekStartDate(now);
      const createdAt = now.toISOString();

      // 次のステップへ渡す値をここで定義
      // 引数を変更する際は、save_raw-data.ts, workflows/test_workflows.tsの修正が必要
      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {
          user_id: body.user.id,
          channel_id: channelId,
          message_ts: messageTs,
          meal_status: mealStatus,
          sleep_status: sleepStatus,
          condition,
          work_style: workStyle,
          medication_status: medicationStatus,
          low_mood_status: lowMoodStatus,
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
