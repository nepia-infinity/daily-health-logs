import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { fetchBulkDailyHealthLogs } from "../utils/test_fetch_bulk_daily_health_logs.ts";

const workStyleLabels: Record<string, string> = {
  work_office: "出社",
  work_remote: "在宅勤務",
  work_hybrid: "ハイブリッド",
  work_dayoff: "休み",
  work_off: "休み",
};

const mealStatusLabels: Record<string, string> = {
  meal_yes: "きちんと取れている",
  meal_no: "取れていない",
};

function toDisplayLabel(
  value: unknown,
  labels: Record<string, string> = {},
): string {
  if (typeof value !== "string" || value.length === 0) {
    return "未回答";
  }

  return labels[value] ?? value;
}

/**
 * 提出ブロックを生成するための引数の型定義
 * @property {string} lowMoodStatus - 気分の落ち込みの有無 (例: "low_mood_present" | "low_mood_absent")
 * @property {string} dayOfWeek - 回答日の曜日（英語の短縮形） (例: "Mon" | "Tue" | "Wed" | "Thu" | "Fri")
 * @property {string} medicationStatus - 服薬状況 (例: "medication_taken" | "medication_not_taken")
 * @property {string} recordDate - 回答日（YYYY-MM-DD形式）
 * @property {string} weekStartDate - 週の開始日（YYYY-MM-DD形式）
 * @property {string} userId - SlackユーザーID
 */
export type CompletionBlockParams = {
  lowMoodStatus: string;
  dayOfWeek: string;
  medicationStatus: string;
  recordDate: string;
  weekStartDate: string;
  userId: string;
};

/**
 * Slack Block Kit の要素を定義する型
 */
export type SlackBlock = {
  type: string;
  block_id?: string;
  [key: string]: unknown; // textやchartなど、ブロックごとの固有プロパティを安全に許容する
};

/**
 * 体調チェックの提出完了後に表示するBlock Kit
 */
export async function buildSubmissionCompletionBlocks(
  params: CompletionBlockParams,
  client: SlackAPIClient,
): Promise<SlackBlock[]> {
  const isFriday = params.dayOfWeek === "Fri";
  const hasLowMood = params.lowMoodStatus === "low_mood_present";
  const missedMedication = params.medicationStatus === "medication_not_taken";

  const blocks: SlackBlock[] = [];

  // 基本の完了メッセージ
  let mainMessage = ":white_check_mark: 体調チェックを送信しました。";

  // きちんと服薬をしており、気分の落ち込みもなく金曜以外の処理
  if (!isFriday && !missedMedication && !hasLowMood) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: mainMessage,
      },
    });
  }

  // 服薬のアラートメッセージ
  if (missedMedication) {
    blocks.push({
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": ":pill: お薬の飲み忘れはありませんか？",
        "emoji": true,
      },
      "level": 2,
    });

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":bulb: Tips: Slackのリマインダー機能を活用しましょう :slack:",
      },
    });

    // コピーできるコマンド部分
    blocks.push({
      type: "rich_text",
      elements: [
        {
          type: "rich_text_preformatted",
          language: "plain-text",
          elements: [
            {
              type: "text",
              text: '/remind me "服薬を忘れずに" every weekday at 12:00',
            },
          ],
        },
      ],
    });
  }

  // グラフとテーブル
  if (isFriday || hasLowMood) {
    const weekStartDate = params.weekStartDate;
    const weekEndDate = params.recordDate;

    // datastoreから取得したデータ
    const dailyHealthLogs = await fetchBulkDailyHealthLogs(
      client,
      params.userId,
      weekStartDate,
    );

    // 週の開始日と一致するデータをフィルタリングし、record_dateでソートする
    const sortedLogs = dailyHealthLogs
      .filter((log) => log.week_start_date === weekStartDate)
      .sort((a, b) => a.record_date.localeCompare(b.record_date));
    console.log(JSON.stringify({
      event: "weekly_health_logs_prepared",
      week_start_date: weekStartDate,
      record_count: sortedLogs.length,
      record_dates: sortedLogs.map((log) => log.record_date),
    }));

    // 2026-06-22 〜 2026-06-28のように表示する
    // hasLowMoodがtrueの場合、必ずしも金曜とは限らないため、weekEndDateは今日の日付とする
    mainMessage = `:date: サマリー（${weekStartDate} 〜 ${weekEndDate}）\n`;
    let subMessage = "";

    // ヘッダーを追加
    blocks.push({
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": mainMessage,
        "emoji": true,
      },
      "level": 1,
    });

    // 条件に応じてsubMessageを変更する
    if (hasLowMood) {
      subMessage =
        ":stethoscope: 困っていることは抱え込まず早めに相談してくださいね。\n";
    }

    if (isFriday && hasLowMood) {
      subMessage = "最近無理しすぎていませんか？\n";
    }

    // 案内文が空の場合は、空文字のsectionを追加しない
    if (subMessage) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: subMessage,
        },
      });
    }

    // Datastoreから取得できたスコアだけをグラフへ反映する
    const chartLogs = sortedLogs.filter((log) =>
      typeof log.day_of_week === "string" &&
      typeof log.sleep_score === "number" &&
      Number.isFinite(log.sleep_score) &&
      typeof log.condition_score === "number" &&
      Number.isFinite(log.condition_score)
    );

    if (chartLogs.length > 0) {
      const categories = chartLogs.map((log) => log.day_of_week);

      blocks.push({
        type: "data_visualization",
        block_id: "viz-line-multi",
        title: "睡眠と体調の推移",
        chart: {
          type: "line",
          series: [
            {
              name: "睡眠",
              data: chartLogs.map((log) => ({
                label: log.day_of_week,
                value: log.sleep_score,
              })),
            },
            {
              name: "体調",
              data: chartLogs.map((log) => ({
                label: log.day_of_week,
                value: log.condition_score,
              })),
            },
          ],
          axis_config: {
            categories,
            x_label: "Day",
            y_label: "Score",
          },
        },
      });
    } else {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "この週は、グラフに表示できる体調データがまだありません。",
        },
      });
    }

    // テーブルブロック
    blocks.push({
      type: "data_table",
      caption: "勤務スタイルと食事",
      rows: [
        [
          { type: "raw_text", text: "Work-Style" },
          { type: "raw_text", text: "Day" },
          { type: "raw_text", text: "Meal Status" },
        ],
        ...sortedLogs.map((log) => [
          {
            type: "raw_text",
            text: toDisplayLabel(log.work_style, workStyleLabels),
          },
          {
            type: "raw_text",
            text: toDisplayLabel(log.day_of_week),
          },
          {
            type: "raw_text",
            text: toDisplayLabel(log.meal_status, mealStatusLabels),
          },
        ]),
      ],
    });
  }

  return blocks;
}
