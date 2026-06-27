const DAILY_HEALTH_LOGS_DATASTORE = "daily_health_logs";

/**
 * スコア化したいradio_buttonsの選択肢を、action_idごとに並び順で定義する。
 *
 * 例:
 * - action_sleep の0番目 sleep_good は scoreValues[0] の 1
 * - action_sleep の1番目 sleep_slight は scoreValues[1] の 0.75
 *
 * Slackへ送信するBlock Kitのoptionsには独自キーを混ぜず、
 * 保存時のスコア変換だけをこの定義で行う。
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

/** radio_buttonsの選択結果から使う最小限のpayload型。 */
type SelectedOptionAction = {
  selected_option?: {
    value?: string;
  };
};

/** Block Actions Handlerで受け取るbodyから、このファイルで使う項目だけを定義する。 */
type BlockActionBody = {
  user?: {
    id?: string;
  };
  state?: {
    values?: Record<string, Record<string, SelectedOptionAction>>;
  };
};

/** daily_health_logs Datastoreへ保存する1日分の体調チェックログ。 */
type DailyHealthLogItem = {
  record_id: string;
  user_id: string;
  record_date: string;
  week_start_date: string;
  day_of_week: string;
  created_at: string;
  meal: string;
  sleep: string;
  sleep_score: number;
  condition: string;
  condition_score: number;
  work_style: string;
  medication: string;
  depression: string;
  channel_id: string;
  message_ts: string;
};

/** apps.datastore.put の戻り値のうち、このファイルで使う項目だけを定義する。 */
type DatastorePutResponse = {
  ok: boolean;
  error?: string;
};

/** SlackFunctionのclientから、このファイルで使うDatastore APIだけを定義する。 */
type DatastoreClient = {
  apps: {
    datastore: {
      put: (args: {
        datastore: string;
        item: DailyHealthLogItem;
      }) => Promise<DatastorePutResponse>;
    };
  };
};

/** saveRawDataへ渡す引数。nowはテストや日付固定確認用に差し替え可能にしている。 */
type SaveRawDataParams = {
  client: DatastoreClient;
  body: BlockActionBody;
  channelId: string;
  messageTs: string;
  now?: Date;
};

/** 保存結果。金曜集計など後続処理で使いやすいよう、日付と曜日も返す。 */
type SaveRawDataResult = {
  ok: boolean;
  error?: string;
  recordId?: string;
  recordDate?: string;
  dayOfWeek?: string;
};

/**
 * 体調チェックの送信ボタン押下時に、回答内容をDatastoreへ保存する。
 *
 * - body.state.values から各radio_buttonsのvalueを取り出す
 * - record_idを `${user_id}#YYYY-MM-DD` の形式で作る
 * - 睡眠と体調はグラフ表示用に0〜1のscoreへ変換する
 * - chat.updateで後から同じメッセージを更新できるよう channel_id と message_ts も保存する
 */
export async function saveRawData({
  client,
  body,
  channelId,
  messageTs,
  now = new Date(),
}: SaveRawDataParams): Promise<SaveRawDataResult> {
  const userId = body.user?.id;

  if (!userId) {
    return {
      ok: false,
      error: "user_id が取得できませんでした。",
    };
  }

  const values = body.state?.values ?? {};

  // action_idを指定して、Block Kitのstate.valuesから選択済みvalueだけを取り出す。
  const meal = getSelectedValue(values, "action_meal");
  const sleep = getSelectedValue(values, "action_sleep");
  const condition = getSelectedValue(values, "action_condition");
  const workStyle = getSelectedValue(values, "action_work_style");
  const medication = getSelectedValue(values, "action_medication");
  const depression = getSelectedValue(values, "action_depression");

  const recordDate = formatDateJst(now);
  const weekStartDate = getWeekStartDateJst(now);
  const dayOfWeek = getDayOfWeekJst(now);

  // 1ユーザー1日1レコードにするため、同じ日に再送信した場合は同じrecord_idへ上書きされる。
  const recordId = `${userId}#${recordDate}`;

  const result = await client.apps.datastore.put({
    datastore: DAILY_HEALTH_LOGS_DATASTORE,
    item: {
      record_id: recordId,
      user_id: userId,
      record_date: recordDate,
      week_start_date: weekStartDate,
      day_of_week: dayOfWeek,
      created_at: now.toISOString(),
      meal,
      sleep,
      sleep_score: toScore("action_sleep", sleep),
      condition,
      condition_score: toScore("action_condition", condition),
      work_style: workStyle,
      medication,
      depression,
      channel_id: channelId,
      message_ts: messageTs,
    },
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? "Datastoreへの保存に失敗しました。",
    };
  }

  return {
    ok: true,
    recordId,
    recordDate,
    dayOfWeek,
  };
}

/**
 * Slackのblock_actions payloadから、指定したaction_idのselected_option.valueを探す。
 *
 * state.valuesは block_id -> action_id -> action の入れ子構造なので、
 * block_idを固定せず、すべてのblockを走査して対象actionを見つける。
 */
function getSelectedValue(
  values: Record<string, Record<string, SelectedOptionAction>>,
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
 * action_idごとの選択肢配列と、選択肢の位置に対応するscoreValuesからスコアを返す。
 *
 * scoreOptionsにないaction_idや、未選択・未知のvalueは0として扱う。
 */
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
 *
 * 先にJSTの日付文字列へ変換し、その日付だけをUTC Dateとして扱うことで、
 * 実行環境のタイムゾーン差による日付ズレを避ける。
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
