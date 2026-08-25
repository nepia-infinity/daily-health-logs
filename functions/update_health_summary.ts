import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { buildSubmissionCompletionBlocks } from "../blocks/submission_completion_blocks.ts";

/**
 * Datastoreへの保存完了後に、体調サマリーをSlackメッセージへ反映するFunction
 */
export const UpdateHealthSummaryFunction = DefineFunction({
  callback_id: "update_health_summary",
  title: "体調サマリーを更新",
  description:
    "保存済みの体調データを取得し、グラフなどをSlackメッセージへ反映します",
  source_file: "functions/update_health_summary.ts",
  input_parameters: {
    properties: {
      record_id: {
        type: Schema.types.string,
        description: "Datastoreに保存したレコードID",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "回答したSlackユーザーのID",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "更新対象メッセージのチャンネルID",
      },
      message_ts: {
        type: Schema.slack.types.message_ts,
        description: "更新対象メッセージのタイムスタンプ",
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
    },
    required: [
      "record_id",
      "user_id",
      "channel_id",
      "message_ts",
      "medication_status",
      "low_mood_status",
      "record_date",
      "week_start_date",
      "day_of_week",
    ],
  },
});

export default SlackFunction(
  UpdateHealthSummaryFunction,
  async ({ inputs, client }) => {
    console.log(JSON.stringify({
      event: "health_summary_update_started",
      record_date: inputs.record_date,
      week_start_date: inputs.week_start_date,
    }));

    const submissionCompletionBlocks = await buildSubmissionCompletionBlocks(
      {
        lowMoodStatus: inputs.low_mood_status,
        dayOfWeek: inputs.day_of_week,
        medicationStatus: inputs.medication_status,
        recordDate: inputs.record_date,
        weekStartDate: inputs.week_start_date,
        userId: inputs.user_id,
      },
      client,
    );

    const updateResponse = await client.chat.update({
      channel: inputs.channel_id,
      ts: inputs.message_ts,
      text: "体調チェックを送信しました。",
      blocks: submissionCompletionBlocks,
    });

    if (!updateResponse.ok) {
      return {
        error: `メッセージ更新に失敗しました: ${updateResponse.error}`,
      };
    }

    return {
      outputs: {},
    };
  },
);
