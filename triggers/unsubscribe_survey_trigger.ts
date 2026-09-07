import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import ManageSurveySubscriptionWorkflow from "../workflows/manage_survey_subscription_workflow.ts";

const unsubscribeSurveyTrigger: Trigger<
  typeof ManageSurveySubscriptionWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "体調アンケートの定期配信を停止",
  description: "実行したユーザーを定期配信の対象外にします",
  workflow:
    `#/workflows/${ManageSurveySubscriptionWorkflow.definition.callback_id}`,
  inputs: {
    user_id: {
      value: TriggerContextData.Shortcut.user_id,
    },
    survey_enabled: {
      value: false,
    },
  },
};

export default unsubscribeSurveyTrigger;
