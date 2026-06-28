import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { DateUtils } from "../utils/date_utils.ts";
import { fetchUserTimeZone } from "../utils/call_slack_user_info.ts";

const DAILY_HEALTH_LOGS_DATASTORE = "daily_health_logs";

/**
 * スコア化したいradio_buttonsの選択肢を、action_idごとに並び順で定義する。
 */
const scoreOptions: Record<string, readonly string[]> = {
  action_sleep: [
    "sleep_good",
    "sleep_slight",
    "sleep_poor",
    "sleep_none",
  ],
  action_condition: [
    "condition_excellent",
    "condition_good",
    "condition_poor",
    "condition_bad",
  ],
};

/** scoreOptions内の選択肢の並び順に対応するスコア。 */
const scoreValues = [1, 0.75, 0.5, 0.25] as const;

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
  SaveRawDataFunction,
  async ({ inputs, client }) => {
    const now = new Date();

    // 回答したユーザーのtimezoneを取得する
    const userTz = await fetchUserTimeZone(client, inputs.user_id);
    const dateUtils = new DateUtils(userTz);

    // timezoneを反映した日時に変換する
    const recordDate = dateUtils.formatDate(now);
    const weekStartDate = dateUtils.getWeekStartDate(now);
    const dayOfWeek = dateUtils.getDayOfWeek(now);

    // datastore検索用のUUIDを生成する （例）U0BC46H2U3C#2026-06-28
    // command-example: slack datastore get --datastore daily_health_logs '{"id": "U0BC46H2U3C#2026-06-28"}'
    const recordId = `${inputs.user_id}#${recordDate}`;

    const result = await client.apps.datastore.put({
      datastore: DAILY_HEALTH_LOGS_DATASTORE,
      item: {
        record_id: recordId,
        user_id: inputs.user_id,
        record_date: recordDate,
        week_start_date: weekStartDate,
        day_of_week: dayOfWeek,
        created_at: now.toISOString(),
        meal: inputs.meal,
        sleep: inputs.sleep,
        sleep_score: toScore("action_sleep", inputs.sleep),
        condition: inputs.condition,
        condition_score: toScore("action_condition", inputs.condition),
        work_style: inputs.work_style,
        medication: inputs.medication,
        depression: inputs.depression,
        channel_id: inputs.channel_id,
        message_ts: inputs.message_ts,
      },
    });

    if (!result.ok) {
      return {
        error: result.error ?? "Datastoreへの保存に失敗しました。",
      };
    }

    return {
      outputs: {},
    };
  },
);

function toScore(actionId: string, value: string): number {
  const options = scoreOptions[actionId];

  if (!options) {
    return 0;
  }

  const index = options.indexOf(value);

  if (index === -1) {
    return 0;
  }

  return scoreValues[index] ?? 0;
}
