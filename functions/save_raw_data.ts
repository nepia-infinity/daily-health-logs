import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { getConditionScore, getSleepScore } from "../utils/health_scores.ts";

const DAILY_HEALTH_LOGS_DATASTORE = "daily_health_logs";

export const SaveRawDataFunction = DefineFunction({
  callback_id: "save_raw_data",
  title: "体調チェック回答を保存",
  description: "体調チェックの回答内容をDatastoreへ保存します",
  source_file: "functions/save_raw_data.ts",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "回答したSlackユーザーのID",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "体調チェックメッセージのチャンネルID",
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
  output_parameters: {
    properties: {
      record_id: {
        type: Schema.types.string,
        description: "Datastoreに保存したレコードID",
      },
    },
    required: ["record_id"],
  },
});

export default SlackFunction(
  SaveRawDataFunction,
  async ({ inputs, client }) => {
    const sleepScore = getSleepScore(inputs.sleep_status);

    if (sleepScore === undefined) {
      return {
        error: "sleep_statusに未対応の回答コードが指定されました。",
      };
    }

    const conditionScore = getConditionScore(inputs.condition);

    if (conditionScore === undefined) {
      return {
        error: "conditionに未対応の回答コードが指定されました。",
      };
    }

    // datastore検索用のUUIDを生成する （例）U0BC46H2U3C#2026-06-28
    // （例）slack datastore get --datastore daily_health_logs '{"id": "U0BC46H2U3C#2026-06-28"}'
    const recordId = `${inputs.user_id}#${inputs.record_date}`;
    const result = await client.apps.datastore.put({
      datastore: DAILY_HEALTH_LOGS_DATASTORE,
      item: {
        record_id: recordId,
        user_id: inputs.user_id,
        record_date: inputs.record_date,
        week_start_date: inputs.week_start_date,
        day_of_week: inputs.day_of_week,
        created_at: inputs.created_at,
        meal_status: inputs.meal_status,
        sleep_status: inputs.sleep_status,
        sleep_score: sleepScore,
        condition: inputs.condition,
        condition_score: conditionScore,
        work_style: inputs.work_style,
        medication_status: inputs.medication_status,
        low_mood_status: inputs.low_mood_status,
        channel_id: inputs.channel_id,
        message_ts: inputs.message_ts,
      },
    });

    if (!result.ok) {
      return {
        error: result.error ?? "Datastoreへの保存に失敗しました。",
      };
    }

    console.log(JSON.stringify({
      event: "daily_health_log_saved",
      record_date: inputs.record_date,
      week_start_date: inputs.week_start_date,
    }));

    return {
      outputs: {
        record_id: recordId,
      },
    };
  },
);
