import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * Slackユーザーのプロフィールと体調アンケートの配信設定を管理するDatastore
 *
 * survey_enabled が true のユーザーだけを配信対象とします。
 * 既存レコードで survey_enabled が未設定の場合は配信対象に含めません。
 */
const SlackUserProfilesDatastore = DefineDatastore({
  name: "slack_user_profiles",
  primary_key: "slack_member_id",
  attributes: {
    slack_member_id: {
      type: Schema.slack.types.user_id,
      description: "アンケートを送信するSlackユーザーのメンバーID",
    },
    screen_name: {
      type: Schema.types.string,
      description: "管理画面などで表示するSlackユーザー名",
    },
    mail_address: {
      type: Schema.types.string,
      description: "連絡先メールアドレス",
    },
    gender: {
      type: Schema.types.string,
      description: "性別",
    },
    birth_date: {
      type: Schema.types.string,
      description: "生年月日（YYYY-MM-DD）",
    },
    survey_enabled: {
      type: Schema.types.boolean,
      description: "体調アンケートの定期配信を有効にするか",
    },
    dm_channel_id: {
      type: Schema.slack.types.channel_id,
      description: "定期配信に使用するSlack AppとのDMチャンネルID",
    },
    last_delivery_date: {
      type: Schema.types.string,
      description: "最後に定期配信した日（YYYY-MM-DD）",
    },
    created_at: {
      type: Schema.slack.types.timestamp,
      description: "参加者レコードの作成日時",
    },
    updated_at: {
      type: Schema.slack.types.timestamp,
      description: "参加者レコードの最終更新日時",
    },
  },
});

export default SlackUserProfilesDatastore;
