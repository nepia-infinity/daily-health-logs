import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SendTestHealthCheckBlocksFunction } from "../functions/send_test_health_check_blocks.ts";
import { SaveRawDataFunction } from "../functions/save_raw_data.ts";

/**
 * 体調チェックBlock KitをSlack AppからDMでテスト送信するWorkflow
 *
 * 体調に関する個人情報を扱うため、
 * パブリックチャンネルではなく、対象ユーザーへのDMに送信します。
 */
const TestHealthCheckWorkflow = DefineWorkflow({
  callback_id: "test_health_check_workflow",
  title: "体調チェックBlock Kitテスト",
  description:
    "Slack Block Kit Builder形式のJSONをSlack AppからDMでテスト送信します",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
        description: "DM送信先のSlackユーザー",
      },
    },
    required: ["user_id"],
  },
});

const healthCheckStep = TestHealthCheckWorkflow.addStep(
  SendTestHealthCheckBlocksFunction,
  {
    user_id: TestHealthCheckWorkflow.inputs.user_id,
  },
);

TestHealthCheckWorkflow.addStep(SaveRawDataFunction, {
  user_id: healthCheckStep.outputs.user_id,
  channel_id: healthCheckStep.outputs.channel_id,
  message_ts: healthCheckStep.outputs.message_ts,
  meal: healthCheckStep.outputs.meal,
  sleep: healthCheckStep.outputs.sleep,
  condition: healthCheckStep.outputs.condition,
  work_style: healthCheckStep.outputs.work_style,
  medication: healthCheckStep.outputs.medication,
  depression: healthCheckStep.outputs.depression,
  record_date: healthCheckStep.outputs.record_date,
  week_start_date: healthCheckStep.outputs.week_start_date,
  day_of_week: healthCheckStep.outputs.day_of_week,
  created_at: healthCheckStep.outputs.created_at,
});

export default TestHealthCheckWorkflow;
