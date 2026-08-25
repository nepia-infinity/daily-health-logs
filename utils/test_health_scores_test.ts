import { strictEqual } from "node:assert/strict";
import { getConditionScore, getSleepScore } from "./health_scores.ts";

Deno.test("睡眠状況をグラフ用スコアへ変換できる", () => {
  strictEqual(getSleepScore("sleep_good"), 1);
  strictEqual(getSleepScore("sleep_slight"), 0.75);
  strictEqual(getSleepScore("sleep_poor"), 0.5);
  strictEqual(getSleepScore("sleep_none"), 0.25);
});

Deno.test("体調をグラフ用スコアへ変換できる", () => {
  strictEqual(getConditionScore("condition_excellent"), 1);
  strictEqual(getConditionScore("condition_good"), 0.75);
  strictEqual(getConditionScore("condition_poor"), 0.5);
  strictEqual(getConditionScore("condition_bad"), 0.25);
});

Deno.test("未対応の回答コードはスコアへ変換しない", () => {
  strictEqual(getSleepScore("unknown_sleep_status"), undefined);
  strictEqual(getSleepScore("condition_good"), undefined);
  strictEqual(getConditionScore("unknown_condition"), undefined);
  strictEqual(getConditionScore("sleep_good"), undefined);
});
