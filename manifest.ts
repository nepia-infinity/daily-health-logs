import { Manifest } from "deno-slack-sdk/mod.ts";
import TestHealthCheckWorkflow from "./workflows/test_workflow.ts";
import { SendTestHealthCheckBlocksFunction } from "./functions/test_send_health_check_blocks.ts";
import SlackUserProfilesDatastore from "./datastores/slack_user_profiles.ts";
import DailyHealthLogsDatastore from "./datastores/daily_health_logs.ts";
import { SaveRawDataFunction } from "./functions/save_raw_data.ts";
import { UpdateHealthSummaryFunction } from "./functions/update_health_summary.ts";
import ManageSurveySubscriptionWorkflow from "./workflows/manage_survey_subscription_workflow.ts";
import ScheduledHealthCheckDeliveryWorkflow from "./workflows/scheduled_health_check_delivery_workflow.ts";
import { ManageSurveySubscriptionFunction } from "./functions/manage_survey_subscription.ts";
import { SendScheduledHealthCheckRemindersFunction } from "./functions/send_scheduled_health_check_reminders.ts";

export default Manifest({
  name: "daily-health-logs",
  description: "Daily health check logs with Slack Block Kit",
  icon: "assets/app_logo.png",
  workflows: [
    TestHealthCheckWorkflow,
    ManageSurveySubscriptionWorkflow,
    ScheduledHealthCheckDeliveryWorkflow,
  ],
  functions: [
    SendTestHealthCheckBlocksFunction,
    SaveRawDataFunction,
    UpdateHealthSummaryFunction,
    ManageSurveySubscriptionFunction,
    SendScheduledHealthCheckRemindersFunction,
  ],
  datastores: [
    SlackUserProfilesDatastore,
    DailyHealthLogsDatastore,
  ],
  outgoingDomains: [],
  botScopes: [
    "commands",
    "chat:write",
    "im:write",
    "datastore:read",
    "datastore:write",
    "users:read",
  ],
});
