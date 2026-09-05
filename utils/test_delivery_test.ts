import { deepStrictEqual, strictEqual, throws } from "node:assert/strict";
import { chunkItems, getNextDailyDeliveryStartTime } from "./delivery.ts";

Deno.test("東京時間で次の配信時刻を計算できる", () => {
  strictEqual(
    getNextDailyDeliveryStartTime(
      new Date("2026-09-05T00:01:00.000Z"),
      "Asia/Tokyo",
      9,
      0,
    ),
    "2026-09-06T00:00:00.000Z",
  );
});

Deno.test("夏時間を含むタイムゾーンの配信時刻を計算できる", () => {
  strictEqual(
    getNextDailyDeliveryStartTime(
      new Date("2026-07-01T12:00:00.000Z"),
      "America/New_York",
      9,
      0,
    ),
    "2026-07-01T13:00:00.000Z",
  );
});

Deno.test("配列を指定件数ごとのバッチに分割できる", () => {
  deepStrictEqual(chunkItems([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  deepStrictEqual(chunkItems([], 2), []);
});

Deno.test("不正なバッチ件数を拒否する", () => {
  throws(() => chunkItems([1], 0), RangeError);
  throws(() => chunkItems([1], 1.5), RangeError);
});
