/**
 * 体調チェックの送信後、Datastoreへの保存中に表示するBlock Kit
 */
export const submissionProgressBlocks = [
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "⏳ Datastoreに回答を保存しています...",
    },
  },
];
