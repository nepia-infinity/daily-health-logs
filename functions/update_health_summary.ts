import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

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
    },
    required: [
      "record_id",
      "user_id",
      "channel_id",
      "message_ts",
      "medication",
      "depression",
      "record_date",
      "week_start_date",
      "day_of_week",
    ],
  },
});

export default SlackFunction(
  UpdateHealthSummaryFunction,
  ({ inputs }) => {
    console.log(
      `体調サマリー更新ステップを開始します: ${inputs.record_id}`,
    );

    return {
      outputs: {},
    };
  },
);
