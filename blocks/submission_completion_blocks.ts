import { DateUtils } from "../utils/date_utils.ts";

/**
 * 提出ブロックを生成するための引数の型定義
 * @property {string} depression - 気分の落ち込みの有無 (例: "depression_yes" | "depression_no")
 * @property {string} dayOfWeek - 回答日の曜日（英語の短縮形） (例: "Mon" | "Tue" | "Wed" | "Thu" | "Fri")
 * @property {string} medication - 服薬状況 (例: "meds_taken" | "meds_not_taken")
 * @property {DateUtils} dateUtils - 日付計算ユーティリティのインスタンス
 * @property {Date} now - 実行時の日時オブジェクト
 */
export type CompletionBlockParams = {
  depression: string;
  dayOfWeek: string;
  medication: string;
  dateUtils: DateUtils;
  now: Date;
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
export function buildSubmissionCompletionBlocks(
  params: CompletionBlockParams,
): SlackBlock[] {
  const isFriday = params.dayOfWeek === "Fri";
  const isDepressed = params.depression === "depression_yes";
  const forgotMeds = params.medication === "meds_not_taken";

  const blocks: SlackBlock[] = [];

  // 基本の完了メッセージ
  let mainMessage = ":white_check_mark: 体調チェックを送信しました。";

  // きちんと服薬をしており、気分の落ち込みもなく金曜以外の処理
  if(!isFriday && !forgotMeds && !isDepressed){
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: mainMessage,
      },
    });
  }

  // 服薬のアラートメッセージ
  if (forgotMeds) {
    blocks.push({
			"type": "header",
			"text": {
				"type": "plain_text",
				"text": ":pill: お薬の飲み忘れはありませんか？",
				"emoji": true
			},
			"level": 2
		})

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
  if (isFriday || isDepressed) {
    const weekStartDate = params.dateUtils.getWeekStartDate(params.now); // 例: "2026-06-22"
    const weekEndDate = params.dateUtils.formatDate(params.now);

    // 2026-06-22 〜 2026-06-28のように表示する
    // isDepressedがtrueの場合、必ずしも金曜とは限らないため、weekEndDateは今日の日付とする
    mainMessage = `:date: サマリー（${weekStartDate} 〜 ${weekEndDate}）\n`;
    let subMessage = "";

    // ヘッダーを追加
    blocks.push({
			"type": "header",
			"text": {
				"type": "plain_text",
				"text": mainMessage,
				"emoji": true
			},
			"level": 1
		});

    // 条件に応じてsubMessageを変更する
    if (isDepressed) {
      subMessage = ":stethoscope: 困っていることは抱え込まず早めに相談してくださいね。\n";
    }

    if (isFriday && isDepressed) {
      subMessage = "最近無理しすぎていませんか？\n";
    }

    // 既存blocksにsubMessageを追加
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: subMessage,
      },
    });

    // グラフブロック
    blocks.push({
      type: "data_visualization",
      block_id: "viz-line-multi",
      title: "睡眠と体調の推移",
      chart: {
        type: "line",
        series: [
          {
            name: "睡眠",
            data: [
              { label: "Mon", value: 1 },
              { label: "Tue", value: 0.75 },
              { label: "Wed", value: 0.5 },
              { label: "Thu", value: 0.25 },
              { label: "Fri", value: 0.5 },
            ],
          },
          {
            name: "体調",
            data: [
              { label: "Mon", value: 1 },
              { label: "Tue", value: 0.75 },
              { label: "Wed", value: 0.25 },
              { label: "Thu", value: 0.25 },
              { label: "Fri", value: 0.75 },
            ],
          },
        ],
        axis_config: {
          categories: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          x_label: "Day",
          y_label: "Score",
        },
      },
    });

    // テーブルブロック
    blocks.push({
      type: "data_table",
      caption: "勤務スタイルと食事",
      rows: [
        [
          { type: "raw_text", text: "Work-Style" },
          { type: "raw_text", text: "Day" },
          { type: "raw_text", text: "Has-Meal" },
        ],
        [
          { type: "raw_text", text: "在宅勤務" },
          { type: "raw_text", text: "Mon" },
          { type: "raw_number", value: 1, text: "きちんと取れている" },
        ],
        [
          { type: "raw_text", text: "出社" },
          { type: "raw_text", text: "Fri" },
          { type: "raw_number", value: 1, text: "きちんと取れている" },
        ],
      ],
    });
  }

  return blocks;
}