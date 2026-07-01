/**
 * 
 * Slack Block Kitを使ったラジオボタンを含むメッセージ内容を生成する一連の処理
 * 
 * 
 * 
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

function radioButtonsBlock(
  blockId: string,
  actionId: string,
  options: Array<{ text: string; value: string }>,
) {
  return {
    type: "actions",
    block_id: blockId,
    elements: [
      {
        type: "radio_buttons",
        options: options.map((option) => {
          return {
            text: plainText(option.text),
            value: option.value,
          };
        }),
        action_id: actionId,
      },
    ],
  };
}

function buildDailyHealthCheckBlocks() {
  const questions = [
    {
      title: "きちんと食事を取れていますか？",
      blockId: "block_meal",
      actionId: "action_meal",
      options: [
        { text: "はい", value: "meal_yes" },
        { text: "いいえ", value: "meal_no" },
      ],
    },
    {
      title: "きちんと眠れていますか？",
      blockId: "block_sleep",
      actionId: "action_sleep",
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
      actionId: "action_condition",
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
      actionId: "action_work_style",
      options: [
        { text: "出社", value: "work_office" },
        { text: "在宅勤務", value: "work_remote" },
        { text: "ハイブリッド", value: "work_hybrid" },
        { text: "休み", value: "work_dayoff" },
      ],
    },
    {
      title: "服薬は忘れていませんか？",
      blockId: "block_medication",
      actionId: "action_medication",
      options: [
        { text: "問題ありません", value: "meds_taken" },
        { text: "忘れていたかも", value: "meds_not_taken" },
      ],
    },
    {
      title: "気分の落ち込みはありませんか？",
      blockId: "block_depression",
      actionId: "action_depression",
      options: [
        { text: "問題ありません", value: "depression_no" },
        { text: "落ち込みがあります", value: "depression_yes" },
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
      ),
    );
  }

  blocks.push(actionButtonsBlock());

  return blocks;
}

/**
 * for文で生成した質問内容を成形する
 * 
 * {
 *  blocks:[ここに各blockが入る]
 * }
 * 
 */
const healthCheckBlocks = buildDailyHealthCheckBlocks();
const healthCheckBlocksObject = {
  blocks: healthCheckBlocks,
};

console.log(JSON.stringify(healthCheckBlocksObject, null, 2));

export { healthCheckBlocks };