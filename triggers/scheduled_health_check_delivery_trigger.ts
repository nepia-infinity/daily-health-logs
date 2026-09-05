import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import {
  DELIVERY_HOUR,
  DELIVERY_MINUTE,
  DELIVERY_TIME_ZONE,
} from "../config/delivery.ts";
import { getNextDailyDeliveryStartTime } from "../utils/delivery.ts";
import ScheduledHealthCheckDeliveryWorkflow from "../workflows/scheduled_health_check_delivery_workflow.ts";

const scheduledHealthCheckDeliveryTrigger: Trigger<
  typeof ScheduledHealthCheckDeliveryWorkflow.definition
> = {
  type: TriggerTypes.Scheduled,
  name: "体調チェックの定期配信",
  description: "登録済みの参加者へ毎日まとめて配信します",
  workflow:
    `#/workflows/${ScheduledHealthCheckDeliveryWorkflow.definition.callback_id}`,
  schedule: {
    start_time: getNextDailyDeliveryStartTime(
      new Date(),
      DELIVERY_TIME_ZONE,
      DELIVERY_HOUR,
      DELIVERY_MINUTE,
    ),
    timezone: DELIVERY_TIME_ZONE,
    frequency: {
      type: "daily",
      repeats_every: 1,
    },
  },
};

export default scheduledHealthCheckDeliveryTrigger;
