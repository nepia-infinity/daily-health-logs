import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import ManageSurveySubscriptionWorkflow from "../workflows/manage_survey_subscription_workflow.ts";

const toggleSurveySubscriptionTrigger: Trigger<
  typeof ManageSurveySubscriptionWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "体調アンケートの定期配信を切り替える",
  description: "実行したユーザー自身の定期配信設定を切り替えます",
  workflow:
    `#/workflows/${ManageSurveySubscriptionWorkflow.definition.callback_id}`,
  inputs: {
    user_id: {
      value: TriggerContextData.Shortcut.user_id,
    },
  },
};

export default toggleSurveySubscriptionTrigger;
