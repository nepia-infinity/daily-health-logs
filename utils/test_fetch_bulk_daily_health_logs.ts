import type { SlackAPIClient } from "deno-slack-sdk/types.ts";

export async function fetchBulkDailyHealthLogs(client: SlackAPIClient) {
  const response = await client.apps.datastore.bulkGet({
    datastore: "daily_health_logs",
    ids: [
      "U0BC46H2U3C#2026-06-27",
      "U0BC46H2U3C#2026-06-28",
      "U0BC46H2U3C#2026-06-29",
      "U0BC46H2U3C#2026-06-30",
    ],
  });

  if (!response.ok) {
    throw new Error(
      `Failed to bulkGet daily health logs: ${response.error ?? "unknown error"}`,
    );
  }

  return response.items ?? [];
}