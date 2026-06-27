import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

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

    const recordDate = formatDateJst(now);
    const weekStartDate = getWeekStartDateJst(now);
    const dayOfWeek = getDayOfWeekJst(now);
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

/** DateをAsia/Tokyo基準のYYYY-MM-DD文字列に変換する。 */
function formatDateJst(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** DateをAsia/Tokyo基準の曜日短縮表記に変換する。例: Mon, Tue, Wed */
function getDayOfWeekJst(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  }).format(date);
}

/**
 * 指定日の週の月曜日をYYYY-MM-DDで返す。
 */
function getWeekStartDateJst(date: Date): string {
  const recordDate = formatDateJst(date);
  const weekStart = parseDateStringAsUtc(recordDate);
  const day = weekStart.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  weekStart.setUTCDate(weekStart.getUTCDate() + diffToMonday);

  return formatDateUtc(weekStart);
}

/** YYYY-MM-DD文字列をUTC基準のDateに変換する。 */
function parseDateStringAsUtc(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

/** UTC DateをYYYY-MM-DD文字列に変換する。 */
function formatDateUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
