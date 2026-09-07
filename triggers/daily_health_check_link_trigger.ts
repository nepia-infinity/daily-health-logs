import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import DailyHealthCheckWorkflow from "../workflows/daily_health_check_workflow.ts";

/**
 * ショートカットURLがクリックされたときに日次体調チェックを開始するトリガー
 */
const dailyHealthCheckLinkTrigger: Trigger<
  typeof DailyHealthCheckWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "日次体調チェックリンクトリガー",
  workflow: `#/workflows/${DailyHealthCheckWorkflow.definition.callback_id}`,
  inputs: {
    user_id: {
      value: TriggerContextData.Shortcut.user_id,
    },
  },
};

export default dailyHealthCheckLinkTrigger;
