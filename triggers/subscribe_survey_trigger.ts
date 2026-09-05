import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import ManageSurveySubscriptionWorkflow from "../workflows/manage_survey_subscription_workflow.ts";

const subscribeSurveyTrigger: Trigger<
  typeof ManageSurveySubscriptionWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "体調アンケートの定期配信を開始",
  description: "実行したユーザーを定期配信の参加者として登録します",
  workflow:
    `#/workflows/${ManageSurveySubscriptionWorkflow.definition.callback_id}`,
  inputs: {
    user_id: {
      value: TriggerContextData.Shortcut.user_id,
    },
    survey_enabled: {
      value: true,
    },
  },
};

export default subscribeSurveyTrigger;
