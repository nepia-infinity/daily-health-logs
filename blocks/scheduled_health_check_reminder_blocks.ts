export type SlackBlock = {
  type: string;
  [key: string]: unknown;
};

/** 定期配信DMに表示する、体調チェック開始ボタン付きBlock Kit。 */
export function scheduledHealthCheckReminderBlocks(
  healthCheckTriggerUrl: string,
): SlackBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "今日の体調チェックをお願いします。回答内容はあなたとこのアプリのDM内で扱われます。",
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "workflow_button",
          action_id: "start_scheduled_health_check",
          text: {
            type: "plain_text",
            text: "体調チェックに回答する",
            emoji: true,
          },
          workflow: {
            trigger: {
              url: healthCheckTriggerUrl,
            },
          },
          style: "primary",
          accessibility_label: "今日の体調チェックを開始する",
        },
      ],
    },
  ];
}
