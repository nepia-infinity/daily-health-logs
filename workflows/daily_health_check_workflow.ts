import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SendHealthCheckFormFunction } from "../functions/send_health_check_form.ts";
import { SaveRawDataFunction } from "../functions/save_raw_data.ts";
import { UpdateHealthSummaryFunction } from "../functions/update_health_summary.ts";

/**
 * 日次体調チェックをDMで送信し、回答を保存するWorkflow
 *
 * 体調に関する個人情報を扱うため、
 * パブリックチャンネルではなく、対象ユーザーへのDMに送信します。
 */
const DailyHealthCheckWorkflow = DefineWorkflow({
  callback_id: "test_health_check_workflow",
  title: "日次体調チェック",
  description: "体調チェックフォームをDMで送信し、回答を保存します",
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

// 入力フォームを投稿するステップ
const healthCheckStep = DailyHealthCheckWorkflow.addStep(
  SendHealthCheckFormFunction,
  {
    user_id: DailyHealthCheckWorkflow.inputs.user_id,
  },
);

// Datastoreに回答内容を保存するステップ
const saveRawDataStep = DailyHealthCheckWorkflow.addStep(
  SaveRawDataFunction,
  {
    user_id: healthCheckStep.outputs.user_id,
    channel_id: healthCheckStep.outputs.channel_id,
    message_ts: healthCheckStep.outputs.message_ts,
    meal_status: healthCheckStep.outputs.meal_status,
    sleep_status: healthCheckStep.outputs.sleep_status,
    condition: healthCheckStep.outputs.condition,
    work_style: healthCheckStep.outputs.work_style,
    medication_status: healthCheckStep.outputs.medication_status,
    low_mood_status: healthCheckStep.outputs.low_mood_status,
    record_date: healthCheckStep.outputs.record_date,
    week_start_date: healthCheckStep.outputs.week_start_date,
    day_of_week: healthCheckStep.outputs.day_of_week,
    created_at: healthCheckStep.outputs.created_at,
  },
);

// Datastoreへの保存完了後に、体調サマリーをSlackメッセージへ反映するステップ
DailyHealthCheckWorkflow.addStep(
  UpdateHealthSummaryFunction,
  {
    record_id: saveRawDataStep.outputs.record_id,
    user_id: healthCheckStep.outputs.user_id,
    channel_id: healthCheckStep.outputs.channel_id,
    message_ts: healthCheckStep.outputs.message_ts,
    medication_status: healthCheckStep.outputs.medication_status,
    low_mood_status: healthCheckStep.outputs.low_mood_status,
    record_date: healthCheckStep.outputs.record_date,
    week_start_date: healthCheckStep.outputs.week_start_date,
    day_of_week: healthCheckStep.outputs.day_of_week,
  },
);

export default DailyHealthCheckWorkflow;
