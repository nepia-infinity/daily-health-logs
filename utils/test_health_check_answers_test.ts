import { assertEquals } from "@std/assert";
import {
  type BlockStateValues,
  getHealthCheckAnswers,
  getMissingHealthCheckAnswerLabels,
} from "./health_check_answers.ts";

Deno.test("全項目の選択値をBlock Kitのstateから取得できる", () => {
  const values: BlockStateValues = {
    block_meal: {
      action_meal: {
        selected_option: { value: "meal_yes" },
      },
    },
    block_sleep: {
      action_sleep: {
        selected_option: { value: "sleep_good" },
      },
    },
    block_condition: {
      action_condition: {
        selected_option: { value: "condition_excellent" },
      },
    },
    block_work_style: {
      action_work_style: {
        selected_option: { value: "work_remote" },
      },
    },
    block_medication_status: {
      action_medication_status: {
        selected_option: { value: "medication_taken" },
      },
    },
    block_low_mood_status: {
      action_low_mood_status: {
        selected_option: { value: "low_mood_absent" },
      },
    },
  };

  assertEquals(getHealthCheckAnswers(values), {
    mealStatus: "meal_yes",
    sleepStatus: "sleep_good",
    condition: "condition_excellent",
    workStyle: "work_remote",
    medicationStatus: "medication_taken",
    lowMoodStatus: "low_mood_absent",
  });
});

Deno.test("未回答の項目名だけを取得できる", () => {
  const answers = getHealthCheckAnswers({
    block_meal: {
      action_meal: {
        selected_option: { value: "meal_yes" },
      },
    },
    block_condition: {
      action_condition: {
        selected_option: { value: "condition_good" },
      },
    },
    block_medication_status: {
      action_medication_status: {
        selected_option: { value: "medication_taken" },
      },
    },
  });

  assertEquals(getMissingHealthCheckAnswerLabels(answers), [
    "睡眠",
    "就業スタイル",
    "気分の落ち込み",
  ]);
});
