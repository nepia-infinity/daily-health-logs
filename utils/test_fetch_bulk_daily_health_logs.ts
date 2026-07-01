import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { DateUtils } from "./date_utils.ts";

export async function fetchBulkDailyHealthLogs(
  client: SlackAPIClient,
  userId: string,
  weekStartDate: string,
) {

  // グラフ描画側で週の開始日と一致するものをフィルタリングする、ここでは5件固定で取得する
  const dateUtils = new DateUtils();
  const ids = Array.from({ length: 5 }, (_, days) =>
    `${userId}#${dateUtils.addDays(weekStartDate, days)}`
  );

  // datastoreからbulkGet（一括）で取得する
  const response = await client.apps.datastore.bulkGet({
    datastore: "daily_health_logs",
    ids: ids,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to bulkGet daily health logs: ${response.error ?? "unknown error"}`,
    );
  }

  // 配列に何もオブジェクトがない場合はエラーをスローする
  if(!response.items?.length) {
    throw new Error("No items found in the response.");
  }

  console.log("=== Datastore Response ===");
  console.log(JSON.stringify(response, null, 2));
  return response.items ?? [];
}