/**
 * 体調チェックの提出完了後に表示するBlock Kit
 *
 * 月〜木はグラフやテーブルを出さず、
 * 提出完了メッセージだけを表示します。
 */
export function buildSubmissionCompletionBlocks() {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "体調チェックを送信しました。",
      },
    },
  ];
}