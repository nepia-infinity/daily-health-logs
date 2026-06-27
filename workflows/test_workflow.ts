import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SendTestHealthCheckBlocksFunction } from "../functions/send_test_health_check_blocks.ts";

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

TestHealthCheckWorkflow.addStep(SendTestHealthCheckBlocksFunction, {
  user_id: TestHealthCheckWorkflow.inputs.user_id,
});

export default TestHealthCheckWorkflow;
