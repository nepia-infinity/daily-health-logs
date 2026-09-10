# Daily Health Logs

Slack上で日々の健康状態を記録し、変化を可視化するためのアプリです。Deno Slack SDKとSlack CLIを使用して構築しています。

> [!NOTE]
> 基本機能は一通り完成しています。現在は個人用ワークスペース（利用者1名）でのみ検証しており、複数ユーザー環境での動作確認は実施していません。

## 主な機能

<img width="800" alt="体調チェック画面" src="https://github.com/user-attachments/assets/689c5bce-2e4a-4037-8f41-d7e6fed39f80" />

- Slackのショートカットから体調チェックを開始
- 定期配信を有効にしたユーザーへ、毎日回答ボタン付きのDMを送信
- 1つのショートカットで定期配信の開始・停止を切り替え
- 6項目の未回答を検出し、回答を保持したままフォーム内に警告を表示
- 回答をSlackのDatastoreへ保存
- 週次サマリーを表やData Visualizationで表示

<img width="800" alt="体調チェックの回答画面" src="https://github.com/user-attachments/assets/a167e8ec-10c9-45d7-9bb0-d2bddcd89401" />
<img width="800" alt="健康状態の可視化画面" src="https://github.com/user-attachments/assets/6ffb2188-5842-4eca-bada-6f57adc65031" />

健康情報の入力と通知は、すべて利用者本人とアプリのDM内で行います。

## 現在の仕様と制約

本アプリはSlack-managed infrastructure上で動作するWorkflow Appです。個人利用を目的としているため、管理者向け画面や詳細な権限管理は実装していません。また、この環境ではApp HomeのHomeタブを利用できません。

| 項目 | 仕様 |
| --- | --- |
| 定期実行 | ワークスペース共通のScheduled Triggerを1つ作成 |
| 配信対象 | `slack_user_profiles`で`survey_enabled`が`true`のユーザー |
| 配信設定 | 利用者本人が共通のリンクトリガーから開始・停止を切り替え |
| 回答導線 | 定期配信DMのボタンから体調チェックを開始 |
| 配信時刻 | `config/delivery.ts`で管理（初期値：`Asia/Tokyo` 8:00） |
| 二重配信防止 | 同じ日に送信済みのユーザーを`last_delivery_date`でスキップ |
| 配信制御 | 5件ずつ送信し、バッチ間に1秒待機。HTTP 429時は最大3回再試行 |

参加者ごとにScheduled Triggerを作成する必要はありません。共通のScheduled TriggerがDatastoreから対象ユーザーを取得し、一括配信します。

## 必要な環境

- [Deno](https://deno.land/)
- [Git](https://git-scm.com/)
- [Slack CLI](https://api.slack.com/automation/quickstart)
- アプリをインストールできるSlackワークスペース
- [Slackの有料プラン](https://slack.com/pricing)

## セットアップ

### 1. リポジトリをクローンする

```zsh
git clone https://github.com/nepia-infinity/daily-health-logs.git
cd daily-health-logs
```

### 2. ローカルで実行する

```zsh
slack run
```

開発版のアプリ名には`(local)`が付きます。終了するには`Ctrl + C`を押します。

WindowsでSlackデスクトップアプリが起動する場合は、PATHの優先順位を見直すか、このREADME内の`slack`を`slack-cli`に読み替えてください。

### 3. 本番環境へデプロイする

```zsh
slack deploy
```

本番運用には、次の3種類のトリガーが必要です。

| 定義ファイル | 種類 | 役割 | 必要数 |
| --- | --- | --- | --- |
| `daily_health_check_link_trigger.ts` | Link Trigger | 体調チェックを開始 | 環境ごとに1つ |
| `toggle_survey_subscription_trigger.ts` | Link Trigger | 定期配信の開始・停止を切り替え | 環境ごとに1つ |
| `scheduled_health_check_delivery_trigger.ts` | Scheduled Trigger | 対象ユーザーへ毎日DMを送信 | 環境ごとに1つ |

ローカル環境と本番環境のトリガーは別物です。本番セットアップでは、各コマンドで`(local)`ではないデプロイ済みアプリを選択してください。

### 4. 体調チェック用リンクトリガーを作成する

```zsh
slack trigger create --trigger-def triggers/daily_health_check_link_trigger.ts
```

作成後に表示されるShortcut URLを環境変数へ登録し、再度デプロイします。

```zsh
slack env set HEALTH_CHECK_TRIGGER_URL 'https://slack.com/shortcuts/...'
slack deploy
```

このURLは定期配信DMの「体調チェックを開始する」ボタンで使用します。実際のURLはREADMEやソースコードへ直接記載しないでください。ローカル環境では、本番とは別に作成したURLをGit管理対象外の`.env`へ設定します。

```dotenv
HEALTH_CHECK_TRIGGER_URL=https://slack.com/shortcuts/...
```

### 5. 定期配信設定用リンクトリガーを作成する

```zsh
slack trigger create --trigger-def triggers/toggle_survey_subscription_trigger.ts
```

作成されたURLは複数の利用者で共有できます。利用者本人が実行すると定期配信が開始され、もう一度実行すると停止します。現在の配信状態は本人宛てのDMで通知されます。

### 6. 配信対象ユーザーを登録する

手順5で作成したURLを利用者本人が実行すると、`slack_user_profiles`へ登録されます。

> [!IMPORTANT]
> Scheduled Triggerを作成しただけでは配信対象ユーザーは登録されません。`survey_enabled: true`のユーザーが0人の場合、Workflowは0件配信として正常終了します。

動作確認などで手動登録する場合は、SlackユーザーIDと表示名を置き換えて実行します。

```zsh
slack datastore put --datastore slack_user_profiles '{"item":{"slack_member_id":"U0123ABCDEF","screen_name":"Example User","survey_enabled":true}}'
```

同じ主キーのレコードがある場合、`datastore put`はレコード全体を置き換えます。既存ユーザーを更新するときは、先に現在の内容を確認してください。

```zsh
slack datastore get --datastore slack_user_profiles '{"id":"U0123ABCDEF"}'
```

### 7. 共通Scheduled Triggerを作成する

```zsh
slack trigger create --trigger-def triggers/scheduled_health_check_delivery_trigger.ts
```

同じ環境に複数作成するとWorkflowが重複して起動します。作成済みのトリガーは次のコマンドで確認できます。

```zsh
slack trigger list
```

## 配信時刻の変更

配信時刻は`config/delivery.ts`で変更します。Scheduled Triggerの実行予定は作成時に確定するため、変更をデプロイした後に既存トリガーを削除し、作り直してください。

```zsh
slack trigger list
slack trigger delete --trigger-id FtXXXXXXXXXX
slack trigger create --trigger-def triggers/scheduled_health_check_delivery_trigger.ts
```

## データストア

| Datastore | 用途 |
| --- | --- |
| `daily_health_logs` | 日々の健康チェックの回答を保存 |
| `slack_user_profiles` | Slackプロフィールと定期配信設定を保存 |

`slack_user_profiles`では、主に次の属性を使用します。

| 属性 | 用途 |
| --- | --- |
| `slack_member_id` | 送信先となるSlackユーザーID |
| `survey_enabled` | 定期配信の有効・無効 |
| `dm_channel_id` | アプリとのDMチャンネルID |
| `last_delivery_date` | 最後に配信した日（YYYY-MM-DD） |
| `created_at` / `updated_at` | 設定の作成日時・更新日時 |

`survey_enabled`が未設定または`false`のユーザーには配信しません。停止時もユーザーのレコードは削除しません。

日次ログは、主キー`record_id`（`ユーザーID#日付`）を指定して確認できます。

```zsh
slack datastore get --datastore daily_health_logs '{"id":"U0123ABCDEF#2026-06-29"}'
```

## 開発と動作確認

fmt、lint、単体テストをまとめて実行します。

```zsh
deno task test
```

本番環境のアクティビティログは、次のコマンドで確認できます。

```zsh
slack activity --tail
```

## トラブルシューティング

### `HEALTH_CHECK_TRIGGER_URL`のエラーが表示される

Scheduled Triggerが動いている環境にShortcut URLが登録されているか確認します。

```zsh
slack env list
```

存在しない場合は、本番環境で作成した体調チェック用リンクトリガーのURLを登録し、再デプロイしてください。

### 定期実行は成功するがDMが届かない

次の順に確認してください。

1. `slack_user_profiles`に対象ユーザーが存在する
2. `survey_enabled`が`true`になっている
3. `last_delivery_date`が今日の日付になっていない
4. `slack activity --tail`に送信エラーが記録されていない

### ローカルでは動くが本番では動かない

本番環境で3種類のトリガーを作成し、本番用の`HEALTH_CHECK_TRIGGER_URL`を登録しているか確認してください。

### DMが重複して届く

`slack trigger list`を実行し、同じ本番環境にScheduled Triggerが複数作成されていないか確認してください。不要なトリガーは削除します。

```zsh
slack trigger delete --trigger-id FtXXXXXXXXXX
```

## 以前のバージョンから更新する場合

過去に`delivery_time`、`time_zone`、`scheduled_trigger_id`を含むDatastoreスキーマをデプロイしている場合は、属性削除を反映する最初の1回だけ`--force`が必要になることがあります。

```zsh
slack deploy --force
```

以前の定期配信開始用・停止用トリガーは、定義ファイルを削除してもSlack上から自動削除されません。`slack trigger list`で確認し、古いトリガーを削除してから`toggle_survey_subscription_trigger.ts`を作成してください。

## プロジェクト構成

| パス | 内容 |
| --- | --- |
| `manifest.ts` | アプリ、Workflow、Function、Datastore、スコープの定義 |
| `blocks/` | Block KitのUI定義 |
| `config/` | 配信時刻などの設定 |
| `datastores/` | 健康記録とユーザープロフィールのDatastore定義 |
| `functions/` | フォーム送信、保存、定期配信などの処理 |
| `triggers/` | Link TriggerとScheduled Triggerの定義 |
| `workflows/` | 各処理を組み合わせるWorkflow定義 |

## リソース

- [Automation Overview](https://api.slack.com/automation)
- [CLI Quick Reference](https://api.slack.com/automation/cli/quick-reference)
- [Deno Slack SDK](https://docs.slack.dev/tools/deno-slack-sdk/)
- [Block Kit Builder](https://app.slack.com/block-kit-builder/)

