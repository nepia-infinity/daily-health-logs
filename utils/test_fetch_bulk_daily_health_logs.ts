import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { DateUtils } from "./date_utils.ts";

export async function fetchBulkDailyHealthLogs(
  client: SlackAPIClient,
  userId: string,
  weekStartDate: string,
) {

  // グラフ描画側で週の開始日と一致するものをフィルタリングする、ここでは最大で7件固定で取得する
  const dateUtils = new DateUtils();
  const ids = Array.from({ length: 7 }, (_, days) =>
    `${userId}#${dateUtils.addDays(weekStartDate, days)}`
  );

  // datastoreからbulkGet（一括）で取得する
  const response = await client.apps.datastore.bulkGet({
    datastore: "daily_health_logs",
    ids: ids,
  });

  // APIのレスポンスがエラーの場合はエラーをスローする
  if (!response.ok) {
    throw new Error(
      `Failed to bulkGet daily health logs: ${response.error ?? "unknown error"}`,
    );
  }

  const items = response.items ?? [];

  console.log(JSON.stringify({
    event: "daily_health_logs_bulk_get_completed",
    week_start_date: weekStartDate,
    requested_count: ids.length,
    returned_count: items.length,
  }));

  // Datastoreにその週のデータが0件の場合は空配列を返す
  return items;
}