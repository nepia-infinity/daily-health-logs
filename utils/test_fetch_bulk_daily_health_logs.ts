import { SlackAPI } from "deno-slack-api/mod.ts";

const token = Deno.env.get("SLACK_BOT_TOKEN");

if (!token) {
  throw new Error("SLACK_BOT_TOKEN is not set.");
}

const client = SlackAPI(token);
const ids = [
  "U0BC46H2U3C#2026-06-27",
  "U0BC46H2U3C#2026-06-28",
  "U0BC46H2U3C#2026-06-29",
  "U0BC46H2U3C#2026-06-30",
];

const response = await client.apps.datastore.bulkGet({
  datastore: "daily_health_logs",
  ids,
});

console.log(JSON.stringify(response, null, 2));

if (!response.ok) {
  throw new Error(
    `Failed to bulkGet daily health logs: ${response.error ?? "unknown error"}`,
  );
}