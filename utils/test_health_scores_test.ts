import { assertEquals } from "@std/assert";
import {
  getConditionScore,
  getSleepScore,
} from "./health_scores.ts";

Deno.test("睡眠状況をグラフ用スコアへ変換できる", () => {
  assertEquals(getSleepScore("sleep_good"), 1);
  assertEquals(getSleepScore("sleep_slight"), 0.75);
  assertEquals(getSleepScore("sleep_poor"), 0.5);
  assertEquals(getSleepScore("sleep_none"), 0.25);
});

Deno.test("体調をグラフ用スコアへ変換できる", () => {
  assertEquals(getConditionScore("condition_excellent"), 1);
  assertEquals(getConditionScore("condition_good"), 0.75);
  assertEquals(getConditionScore("condition_poor"), 0.5);
  assertEquals(getConditionScore("condition_bad"), 0.25);
});

Deno.test("未対応の回答コードはスコアへ変換しない", () => {
  assertEquals(getSleepScore("unknown_sleep_status"), undefined);
  assertEquals(getSleepScore("condition_good"), undefined);
  assertEquals(getConditionScore("unknown_condition"), undefined);
  assertEquals(getConditionScore("sleep_good"), undefined);
});
