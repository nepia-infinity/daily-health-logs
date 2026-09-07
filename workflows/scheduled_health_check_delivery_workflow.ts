import { DefineWorkflow } from "deno-slack-sdk/mod.ts";
import { SendScheduledHealthCheckRemindersFunction } from "../functions/send_scheduled_health_check_reminders.ts";

const ScheduledHealthCheckDeliveryWorkflow = DefineWorkflow({
  callback_id: "scheduled_health_check_delivery_workflow",
  title: "体調チェックの定期配信",
  description: "登録済みの参加者へ体調チェックの回答導線を一括送信します",
});

ScheduledHealthCheckDeliveryWorkflow.addStep(
  SendScheduledHealthCheckRemindersFunction,
  {},
);

export default ScheduledHealthCheckDeliveryWorkflow;
