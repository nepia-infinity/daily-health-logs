import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * 日々の体調チェックログを保存するDatastore
 *
 * record_id は `${user_id}#${record_date}` の形式で保存する
 * 例: U123456#2026-06-22
 */
const DailyHealthLogsDatastore = DefineDatastore({
  name: "daily_health_logs",
  primary_key: "record_id",
  attributes: {
    record_id: {
      type: Schema.types.string,
      description: "ユーザーIDと日付を組み合わせたID。例: U123456#2026-06-22",
    },
    user_id: {
      type: Schema.slack.types.user_id,
      description: "回答したSlackユーザーのID",
    },
    record_date: {
      type: Schema.types.string,
      description: "回答日。YYYY-MM-DD形式。例: 2026-06-22",
    },
    week_start_date: {
      type: Schema.types.string,
      description: "その週の月曜日。YYYY-MM-DD形式。例: 2026-06-22",
    },
    day_of_week: {
      type: Schema.types.string,
      description: "回答した曜日。例: Mon, Tue, Wed, Thu, Fri",
    },
    created_at: {
      type: Schema.types.string,
      description:
        "回答が送信された日時。ISO 8601形式。例: 2026-06-22T10:15:22+09:00",
    },
    meal: {
      type: Schema.types.string,
      description: "食事の回答。例: meal_yes, meal_no",
    },
    sleep: {
      type: Schema.types.string,
      description: "睡眠の回答。例: sleep_good, sleep_none",
    },
    sleep_score: {
      type: Schema.types.number,
      description: "グラフ表示用の睡眠スコア。例: 0〜1",
    },
    condition: {
      type: Schema.types.string,
      description: "体調の回答。例: condition_excellent, condition_bad",
    },
    condition_score: {
      type: Schema.types.number,
      description: "グラフ表示用の体調スコア。例: 0〜1",
    },
    work_style: {
      type: Schema.types.string,
      description:
        "就業スタイル。例: work_office, work_remote, work_hybrid, work_off",
    },
    medication: {
      type: Schema.types.string,
      description: "服薬の回答。例: meds_taken, meds_forgot",
    },
    depression: {
      type: Schema.types.string,
      description: "気分の落ち込み。例: depression_no, depression_yes",
    },
    channel_id: {
      type: Schema.slack.types.channel_id,
      description:
        "client.chat.updateで更新するメッセージのチャンネルID。DMの場合はDから始まるID",
    },
    message_ts: {
      type: Schema.slack.types.message_ts,
      description: "client.chat.updateで更新するメッセージTS",
    },
  },
});

export default DailyHealthLogsDatastore;
