const sleepScoreByStatus = new Map<string, number>([
  ["sleep_good", 1],
  ["sleep_slight", 0.75],
  ["sleep_poor", 0.5],
  ["sleep_none", 0.25],
]);

const conditionScoreByStatus = new Map<string, number>([
  ["condition_excellent", 1],
  ["condition_good", 0.75],
  ["condition_poor", 0.5],
  ["condition_bad", 0.25],
]);

export function getSleepScore(status: string): number | undefined {
  return sleepScoreByStatus.get(status);
}

export function getConditionScore(status: string): number | undefined {
  return conditionScoreByStatus.get(status);
}
