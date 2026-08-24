import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { healthCheckBlocks } from "../blocks/daily_health_check_blocks.ts";
import { submissionProgressBlocks } from "../blocks/submission_progress_blocks.ts";
import { DateUtils } from "../utils/date_utils.ts";
import { fetchUserTimeZone } from "../utils/fetch_slack_user_info.ts";
import {
  getHealthCheckAnswers,
  getMissingHealthCheckAnswerLabels,
  HEALTH_CHECK_ACTION_IDS,
} from "../utils/health_check_answers.ts";

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
    HEALTH_CHECK_ACTION_IDS.mealStatus,
    HEALTH_CHECK_ACTION_IDS.sleepStatus,
    HEALTH_CHECK_ACTION_IDS.condition,
    HEALTH_CHECK_ACTION_IDS.workStyle,
    HEALTH_CHECK_ACTION_IDS.medicationStatus,
    HEALTH_CHECK_ACTION_IDS.lowMoodStatus,
    "submit_survey",
    "cancel_survey",
  ],
  async ({ action, body, client }) => {
    console.log(JSON.stringify({
      event: "health_check_action_received",
      action_id: action.action_id,
    }));

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
      // ラジオボタン押下内容を取得し、全項目が回答済みか確認する
      const values = body.state?.values ?? {};
      const answers = getHealthCheckAnswers(values);
      const missingAnswerLabels = getMissingHealthCheckAnswerLabels(answers);

      if (missingAnswerLabels.length > 0) {
        const validationMessage = `:warning: 未回答の項目があります：${
          missingAnswerLabels.join("、")
        }`;
        const validationResponse = await client.chat.postMessage({
          channel: channelId,
          text: validationMessage,
        });

        if (!validationResponse.ok) {
          console.error(JSON.stringify({
            event: "health_check_validation_message_failed",
            error: validationResponse.error ?? "unknown_error",
          }));
        }

        return {
          completed: false,
        };
      }

      const {
        mealStatus,
        sleepStatus,
        condition,
        workStyle,
        medicationStatus,
        lowMoodStatus,
      } = answers;

      // 送信ボタンを押した直後に、保存中メッセージへ切り替える
      const progressUpdateResponse = await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: "Datastoreに回答を保存しています...",
        blocks: submissionProgressBlocks,
      });

      // 表示の更新に失敗しても、回答データの保存処理は継続する
      if (!progressUpdateResponse.ok) {
        console.error(JSON.stringify({
          event: "health_check_progress_update_failed",
          error: progressUpdateResponse.error ?? "unknown_error",
        }));
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
      // 引数を変更する際は、functions/save_raw_data.ts と workflows/test_workflow.ts の修正が必要
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
