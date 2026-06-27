import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * Slackユーザーの基本プロファイルを管理するDataStore
 */
const SlackUserProfiles = DefineDatastore({
  name: "user-profiles",
  primary_key: "slack_member_id", // SlackのメンバーIDを主キーにして重複を防ぐ
  attributes: {
    slack_member_id: {
      type: Schema.slack.types.user_id, // U0BC46H2U3C などの形式
    },
    screen_name: {
      type: Schema.types.string, // Tsubasa.Kubo
    },
    mail_address: {
      type: Schema.types.string, // nepia.infinity12335@gmail.com
    },
    gender: {
      type: Schema.types.string, // male, female, other などを想定
    },
    birth_date: {
      type: Schema.types.string, // YYYY-MM-DD 形式での保存を推奨（例: "1995-04-15"）
    },
    created_at: {
      type: Schema.slack.types.timestamp, // アカウント登録時のタイムスタンプ
    },
  },
});

export default SlackUserProfiles;
