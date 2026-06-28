import { Manifest } from "deno-slack-sdk/mod.ts";
import TestHealthCheckWorkflow from "./workflows/test_workflow.ts";
import { SendTestHealthCheckBlocksFunction } from "./functions/send_test_health_check_blocks.ts";
import SlackUserProfilesDatastore from "./datastores/slack_user_profiles.ts";
import DailyHealthLogsDatastore from "./datastores/daily_health_logs.ts";

export default Manifest({
  name: "daily-health-logs",
  description: "Daily health check logs with Slack Block Kit",
  icon: "assets/app_logo.png",
  workflows: [
    TestHealthCheckWorkflow,
  ],
  functions: [
    SendTestHealthCheckBlocksFunction,
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
