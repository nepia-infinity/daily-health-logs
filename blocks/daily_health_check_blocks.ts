import {
  HEALTH_CHECK_ACTION_IDS,
  type HealthCheckAnswers,
} from "../utils/health_check_answers.ts";

/**
 * Slack Block Kitを使ったラジオボタンを含むメッセージ内容を生成する一連の処理
 */
function plainText(text: string) {
  return {
    type: "plain_text",
    text,
    emoji: true,
  };
}

function headerBlock(text: string) {
  return {
    type: "header",
    text: plainText(text),
    level: 2,
  };
}

function actionButtonsBlock() {
  return {
    type: "actions",
    elements: [
      {
        type: "button",
        text: plainText("送信"),
        style: "primary",
        action_id: "submit_survey",
      },
      {
        type: "button",
        text: plainText("キャンセル"),
        style: "danger",
        action_id: "cancel_survey",
      },
    ],
  };
}

function validationMessageBlock(message: string) {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: message,
    },
  };
}

function radioButtonsBlock(
  blockId: string,
  actionId: string,
  options: Array<{ text: string; value: string }>,
  selectedValue?: string,
) {
  const slackOptions = options.map((option) => {
    return {
      text: plainText(option.text),
      value: option.value,
    };
  });
  const initialOption = slackOptions.find((option) =>
    option.value === selectedValue
  );

  return {
    type: "actions",
    block_id: blockId,
    elements: [
      {
        type: "radio_buttons",
        options: slackOptions,
        action_id: actionId,
        ...(initialOption ? { initial_option: initialOption } : {}),
      },
    ],
  };
}

type HealthCheckQuestion = {
  title: string;
  blockId: string;
  actionId: string;
  answerKey: keyof HealthCheckAnswers;
  options: Array<{ text: string; value: string }>;
};

export type HealthCheckBlockOptions = {
  answers?: Partial<HealthCheckAnswers>;
  validationMessage?: string;
};

export function buildDailyHealthCheckBlocks(
  {
    answers = {},
    validationMessage,
  }: HealthCheckBlockOptions = {},
) {
  const questions: HealthCheckQuestion[] = [
    {
      title: "きちんと食事を取れていますか？",
      blockId: "block_meal",
      actionId: HEALTH_CHECK_ACTION_IDS.mealStatus,
      answerKey: "mealStatus",
      options: [
        { text: "はい", value: "meal_yes" },
        { text: "いいえ", value: "meal_no" },
      ],
    },
    {
      title: "きちんと眠れていますか？",
      blockId: "block_sleep",
      actionId: HEALTH_CHECK_ACTION_IDS.sleepStatus,
      answerKey: "sleepStatus",
      options: [
        { text: "はい", value: "sleep_good" },
        { text: "やや寝不足", value: "sleep_slight" },
        { text: "あまり眠れていない", value: "sleep_poor" },
        { text: "全く眠れていない", value: "sleep_none" },
      ],
    },
    {
      title: "体調はどうですか？",
      blockId: "block_condition",
      actionId: HEALTH_CHECK_ACTION_IDS.condition,
      answerKey: "condition",
      options: [
        { text: "良好", value: "condition_excellent" },
        { text: "まぁまぁ", value: "condition_good" },
        { text: "あまり良くない", value: "condition_poor" },
        { text: "悪い", value: "condition_bad" },
      ],
    },
    {
      title: "本日の就業スタイルは？",
      blockId: "block_work_style",
      actionId: HEALTH_CHECK_ACTION_IDS.workStyle,
      answerKey: "workStyle",
      options: [
        { text: "出社", value: "work_office" },
        { text: "在宅勤務", value: "work_remote" },
        { text: "ハイブリッド", value: "work_hybrid" },
        { text: "休み", value: "work_dayoff" },
      ],
    },
    {
      title: "服薬は忘れていませんか？",
      blockId: "block_medication_status",
      actionId: HEALTH_CHECK_ACTION_IDS.medicationStatus,
      answerKey: "medicationStatus",
      options: [
        { text: "問題ありません", value: "medication_taken" },
        { text: "忘れていたかも", value: "medication_not_taken" },
      ],
    },
    {
      title: "気分の落ち込みはありませんか？",
      blockId: "block_low_mood_status",
      actionId: HEALTH_CHECK_ACTION_IDS.lowMoodStatus,
      answerKey: "lowMoodStatus",
      options: [
        { text: "問題ありません", value: "low_mood_absent" },
        { text: "落ち込みがあります", value: "low_mood_present" },
      ],
    },
  ];

  const blocks = [];

  for (const question of questions) {
    blocks.push(headerBlock(question.title));
    blocks.push(
      radioButtonsBlock(
        question.blockId,
        question.actionId,
        question.options,
        answers[question.answerKey],
      ),
    );
  }

  blocks.push(actionButtonsBlock());

  if (validationMessage) {
    blocks.push(validationMessageBlock(validationMessage));
  }

  return blocks;
}
