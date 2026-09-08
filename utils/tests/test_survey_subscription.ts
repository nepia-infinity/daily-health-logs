import { strictEqual } from "node:assert/strict";
import { getNextSurveyEnabled } from "../survey_subscription.ts";

Deno.test("未登録のユーザーは定期配信を開始する", () => {
  strictEqual(getNextSurveyEnabled(), true);
});

Deno.test("停止中のユーザーは定期配信を開始する", () => {
  strictEqual(getNextSurveyEnabled(false), true);
});

Deno.test("開始済みのユーザーは定期配信を停止する", () => {
  strictEqual(getNextSurveyEnabled(true), false);
});
