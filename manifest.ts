import { Manifest } from "deno-slack-sdk/mod.ts";
import TestHealthCheckWorkflow from "./workflows/test_workflow.ts";
import { SendTestHealthCheckBlocksFunction } from "./functions/send_test_health_check_blocks.ts";
import SlackUserProfiles from "./datastores/slack_users_profiles.ts";

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
    SlackUserProfiles,
  ],
  outgoingDomains: [],
  botScopes: [
    "commands",
    "chat:write",
    "im:write",
    "datastore:read",
    "datastore:write",
  ],
});
