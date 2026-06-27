import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import TestHealthCheckWorkflow from "../workflows/test_workflow.ts";

/**
 * ショートカットURLがクリックされたときに発火するテスト用トリガー
 */
const testHealthCheckTrigger: Trigger<
  typeof TestHealthCheckWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "体調チェックBlock Kitテストトリガー",
  workflow: `#/workflows/${TestHealthCheckWorkflow.definition.callback_id}`,
  inputs: {
    user_id: {
      value: TriggerContextData.Shortcut.user_id,
    },
  },
};

export default testHealthCheckTrigger;
