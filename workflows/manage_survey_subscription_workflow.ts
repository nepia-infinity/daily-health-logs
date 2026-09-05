import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ManageSurveySubscriptionFunction } from "../functions/manage_survey_subscription.ts";

const ManageSurveySubscriptionWorkflow = DefineWorkflow({
  callback_id: "manage_survey_subscription_workflow",
  title: "体調アンケートの定期配信設定",
  description: "実行したユーザー自身の定期配信を開始または停止します",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "設定を変更するSlackユーザー",
      },
      survey_enabled: {
        type: Schema.types.boolean,
        description: "定期配信を有効にするか",
      },
    },
    required: ["user_id", "survey_enabled"],
  },
});

ManageSurveySubscriptionWorkflow.addStep(ManageSurveySubscriptionFunction, {
  user_id: ManageSurveySubscriptionWorkflow.inputs.user_id,
  survey_enabled: ManageSurveySubscriptionWorkflow.inputs.survey_enabled,
});

export default ManageSurveySubscriptionWorkflow;
