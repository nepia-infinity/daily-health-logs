import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * Slackユーザーの基本プロフィールを管理するDatastore
 */
const SlackUserProfilesDatastore = DefineDatastore({
  name: "slack_user_profiles",
  primary_key: "slack_member_id",
  attributes: {
    slack_member_id: {
      type: Schema.slack.types.user_id,
    },
    screen_name: {
      type: Schema.types.string,
    },
    mail_address: {
      type: Schema.types.string,
    },
    gender: {
      type: Schema.types.string,
    },
    birth_date: {
      type: Schema.types.string,
    },
    created_at: {
      type: Schema.slack.types.timestamp,
    },
  },
});

export default SlackUserProfilesDatastore;
