import { deepStrictEqual } from "node:assert/strict";
import { scheduledHealthCheckReminderBlocks } from "./scheduled_health_check_reminder_blocks.ts";

Deno.test("定期配信DMに体調チェックWorkflowのボタンを含める", () => {
  const triggerUrl = "https://slack.com/shortcuts/example/trigger";
  const blocks = scheduledHealthCheckReminderBlocks(triggerUrl);

  deepStrictEqual(blocks[1], {
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
            url: triggerUrl,
          },
        },
        style: "primary",
        accessibility_label: "今日の体調チェックを開始する",
      },
    ],
  });
});
