export const HEALTH_CHECK_ACTION_IDS = {
  mealStatus: "action_meal",
  sleepStatus: "action_sleep",
  condition: "action_condition",
  workStyle: "action_work_style",
  medicationStatus: "action_medication_status",
  lowMoodStatus: "action_low_mood_status",
} as const;

const healthCheckAnswerKeys = [
  "mealStatus",
  "sleepStatus",
  "condition",
  "workStyle",
  "medicationStatus",
  "lowMoodStatus",
] as const;

export type HealthCheckAnswerKey = typeof healthCheckAnswerKeys[number];

export type HealthCheckAnswers = Record<HealthCheckAnswerKey, string>;

export type SelectedOptionAction = {
  selected_option?: {
    value?: string;
  };
};

export type BlockStateValues = Record<
  string,
  Record<string, SelectedOptionAction>
>;

const healthCheckAnswerLabels: Record<HealthCheckAnswerKey, string> = {
  mealStatus: "食事",
  sleepStatus: "睡眠",
  condition: "体調",
  workStyle: "就業スタイル",
  medicationStatus: "服薬",
  lowMoodStatus: "気分の落ち込み",
};

function getSelectedValue(
  values: BlockStateValues,
  actionId: string,
): string {
  for (const actions of Object.values(values)) {
    const value = actions[actionId]?.selected_option?.value;

    if (value) {
      return value;
    }
  }

  return "";
}

export function getHealthCheckAnswers(
  values: BlockStateValues,
): HealthCheckAnswers {
  return {
    mealStatus: getSelectedValue(
      values,
      HEALTH_CHECK_ACTION_IDS.mealStatus,
    ),
    sleepStatus: getSelectedValue(
      values,
      HEALTH_CHECK_ACTION_IDS.sleepStatus,
    ),
    condition: getSelectedValue(
      values,
      HEALTH_CHECK_ACTION_IDS.condition,
    ),
    workStyle: getSelectedValue(
      values,
      HEALTH_CHECK_ACTION_IDS.workStyle,
    ),
    medicationStatus: getSelectedValue(
      values,
      HEALTH_CHECK_ACTION_IDS.medicationStatus,
    ),
    lowMoodStatus: getSelectedValue(
      values,
      HEALTH_CHECK_ACTION_IDS.lowMoodStatus,
    ),
  };
}

export function getMissingHealthCheckAnswerLabels(
  answers: HealthCheckAnswers,
): string[] {
  return healthCheckAnswerKeys
    .filter((key) => answers[key].length === 0)
    .map((key) => healthCheckAnswerLabels[key]);
}
