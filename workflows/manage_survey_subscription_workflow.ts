import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ManageSurveySubscriptionFunction } from "../functions/manage_survey_subscription.ts";

const ManageSurveySubscriptionWorkflow = DefineWorkflow({
  callback_id: "manage_survey_subscription_workflow",
  title: "体調アンケートの定期配信設定",
  description: "実行したユーザー自身の現在の定期配信設定を切り替えます",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "設定を変更するSlackユーザー",
      },
    },
    required: ["user_id"],
  },
});

ManageSurveySubscriptionWorkflow.addStep(ManageSurveySubscriptionFunction, {
  user_id: ManageSurveySubscriptionWorkflow.inputs.user_id,
});

export default ManageSurveySubscriptionWorkflow;
