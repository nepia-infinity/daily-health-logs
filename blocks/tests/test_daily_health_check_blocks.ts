import { deepStrictEqual, equal } from "node:assert/strict";
import { buildDailyHealthCheckBlocks } from "../daily_health_check_blocks.ts";

type RadioButtonsElement = {
  action_id: string;
  initial_option?: {
    text: {
      type: string;
      text: string;
      emoji: boolean;
    };
    value: string;
  };
};

function findRadioButtonsElement(
  blocks: ReturnType<typeof buildDailyHealthCheckBlocks>,
  blockId: string,
): RadioButtonsElement {
  const block = blocks.find((candidate) =>
    "block_id" in candidate && candidate.block_id === blockId
  );
  const element = block && "elements" in block
    ? block.elements[0] as RadioButtonsElement | undefined
    : undefined;

  if (!element) {
    throw new Error(`${blockId}のラジオボタンが見つかりません。`);
  }

  return element;
}

Deno.test("初期表示では警告とラジオボタンの初期選択を表示しない", () => {
  const blocks = buildDailyHealthCheckBlocks();
  const mealElement = findRadioButtonsElement(blocks, "block_meal");

  equal(mealElement.initial_option, undefined);
  equal(blocks.at(-1)?.type, "actions");
});

Deno.test("未回答警告を表示して選択済みの回答を保持する", () => {
  const validationMessage = ":warning: 未回答の項目があります：睡眠";
  const blocks = buildDailyHealthCheckBlocks({
    answers: {
      mealStatus: "meal_yes",
      condition: "condition_good",
    },
    validationMessage,
  });

  const mealElement = findRadioButtonsElement(blocks, "block_meal");
  const conditionElement = findRadioButtonsElement(blocks, "block_condition");
  const sleepElement = findRadioButtonsElement(blocks, "block_sleep");

  deepStrictEqual(mealElement.initial_option, {
    text: {
      type: "plain_text",
      text: "はい",
      emoji: true,
    },
    value: "meal_yes",
  });
  deepStrictEqual(conditionElement.initial_option, {
    text: {
      type: "plain_text",
      text: "まぁまぁ",
      emoji: true,
    },
    value: "condition_good",
  });
  equal(sleepElement.initial_option, undefined);
  deepStrictEqual(blocks.at(-1), {
    type: "section",
    text: {
      type: "mrkdwn",
      text: validationMessage,
    },
  });
});
