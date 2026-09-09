# Daily Health Logs

これは、Slack上で日々の健康状態を記録し、その変化を可視化するためのアプリです。Deno Slack SDKとSlack CLIを使用して構築しています。

**開発状況（2026-09-09）**
基本機能は一通り完成しています。ただし、利用者1名の個人用ワークスペースでのみ検証しており、複数ユーザー環境での配信・動作確認は実施していません。

本アプリは、Slack-managed infrastructure上で動作するWorkflow Appとして実装しています。この環境ではApp HomeのHomeタブがサポートされていないことに加え、本プロジェクトでは個人利用に目的を絞っているため、管理者向け画面や詳細な権限管理は実装していません。
自身の体調を日々記録し、変化を振り返るためのシンプルな機能を提供します。


**Guide Outline**:

- [概要](#概要)
- [主な機能](#主な機能)
- [現在の運用仕様](#現在の運用仕様)
- [今後の展望](#今後の展望)
- [セットアップ](#セットアップ)
  - [Slack CLIのインストール](#slack-cliのインストール)
  - [リポジトリのクローン](#リポジトリのクローン)
- [ローカルでの実行](#ローカルでの実行)
- [トリガーと本番環境のセットアップ](#トリガーと本番環境のセットアップ)
- [データストア](#データストア)
- [デプロイ](#デプロイ)
- [アクティビティログの表示](#アクティビティログの表示)
- [トラブルシューティング](#トラブルシューティング)
- [プロジェクトの構造](#プロジェクトの構造)
- [リソース](#リソース)

---

## 概要

このアプリは、Slackのショートカットからワークフローを起動し、ユーザーにDMで体調に関する質問を送信します。定期配信を有効にしたユーザーには、ワークスペース共通のScheduled
Triggerから回答ボタン付きのDMを送信します。ユーザーがBlock
Kitで構成されたフォームに回答すると、その内容はSlackがホストするデータストアに安全に保存されます。

個人の健康に関する情報を取り扱うため、やり取りはすべてユーザー個人のDM内で行われ、他のユーザーに情報が見えることはありません。

## 主な機能

<img width="800" alt="image" src="https://github.com/user-attachments/assets/689c5bce-2e4a-4037-8f41-d7e6fed39f80" />

- **体調チェックの開始**:
  Slackのショートカットメニューから簡単に体調チェックを開始できます。
- **本人による定期配信設定**:
  1つのショートカットから、ユーザー自身が定期配信の開始・停止を切り替えられます。
- **一括定期配信**: 1つのScheduled
  Triggerが登録済みユーザーを取得し、少数ずつに分けてDMを送信します。

<img width="800" alt="image" src="https://github.com/user-attachments/assets/a167e8ec-10c9-45d7-9bb0-d2bddcd89401" />
<img width="800" alt="image" src="https://github.com/user-attachments/assets/6ffb2188-5842-4eca-bada-6f57adc65031" />

- **回答チェック**:
  6項目の未回答を検出し、選択済みの回答を保持したままフォーム内に警告を表示します。すべて回答して送信すると警告は消え、保存中・完了表示へ切り替わります。
- **週次サマリー**: Table（表形式）やData
  Visualization（データ可視化）を使用して、保存した健康状態の推移を表示します。
- **データ保存**:
  回答内容はSlackのDatastoreに保存され、後から参照することが可能です。

## 現在の運用仕様

これまでの変更により、現在は次の構成で動作します。

| 項目         | 現在の仕様                                                    |
| ------------ | ------------------------------------------------------------- |
| 定期実行     | ワークスペース共通のScheduled Triggerを1つだけ作成            |
| 配信対象     | `slack_user_profiles`で`survey_enabled`が`true`のユーザー     |
| 参加・停止   | 本人が1つの配信設定用リンクトリガーから切り替え               |
| 回答導線     | 定期配信DMのボタンから体調チェック用リンクトリガーを起動      |
| 配信時刻     | `config/delivery.ts`で一括管理（初期値: `Asia/Tokyo` 8:00）   |
| 二重配信防止 | 同じ日に送信済みのユーザーは`last_delivery_date`でスキップ    |
| 配信制御     | 5件ずつ送信し、バッチ間に1秒待機。HTTP 429時は最大3回再試行   |
| 入力検証     | 6項目すべての回答を必須とし、未回答時はフォーム内に警告を表示 |

参加者ごとにScheduled
Triggerを作成する方式は使用しません。参加者が増えても、共通のScheduled
Triggerが対象ユーザーをDatastoreから取得して一括配信します。

## 今後の展望

現在はSlackのデータストアに情報を保存していますが、将来的にはGoogle Sheets
APIなど外部サービスとの連携も視野に入れています。これにより、記録された健康データをより柔軟に分析・活用できるような構成を目指しています。

## セットアップ

このプロジェクト開発には Deno と Git
が必要です。それぞれの公式サイトを参考に、事前にインストールを済ませてください。

- [Deno公式サイト](https://deno.land/)
- [Git公式サイト](https://git-scm.com/)

セットアップを開始する前に、アプリをインストールする権限のある開発ワークスペースがあることを確認してください。**このプロジェクトの機能を使用するには、ワークスペースが[Slackの有料プラン](https://slack.com/pricing)の一部である必要があることに注意してください。**

### Slack CLIのインストール

このテンプレートを使用するには、Slack
CLIをインストールして設定する必要があります。詳細な手順については、[クイックスタートガイド](https://api.slack.com/automation/quickstart)を参照してください。

### リポジトリのクローン

まず、このリポジトリをクローンします。

```zsh
# このプロジェクトをマシンにクローンします
$ git clone https://github.com/your-username/daily-health-logs.git

# プロジェクトディレクトリに移動します
$ cd daily-health-logs
```

## ローカルでの実行

アプリを開発中、`slack run`コマンドを使用すると、変更をリアルタイムでワークスペースに反映させることができます。開発版のアプリ名は`(local)`という接尾辞がつきます。

```zsh
# アプリをローカルで実行します
slack run

Connected, awaiting events
```

ローカルでの実行を停止するには、`<CTRL> + C`を押してプロセスを終了します。

> **Note for Windows Users:**
> Windows環境では、環境変数のPATHの優先順位によっては、`slack run`のようなコマンドを実行しようとすると、Slackのデスクトップアプリ(`slack.exe`)が起動してしまう場合があります。
> その場合は、ターミナルで`slack.exe`へのパスよりもSlack
> CLIへのパスの優先順位が高くなるように設定するか、このREADME内の`slack`を`slack-cli`に読み替えて実行してください。

## トリガーと本番環境のセットアップ

[トリガー](https://docs.slack.dev/tools/deno-slack-sdk/guides/using-triggers/)は、ワークフローを実行するきっかけです。このアプリでは3種類のトリガーを使用します。

### トリガーの役割

| 定義ファイル                                 | 種類              | 役割                                       | 必要数        |
| -------------------------------------------- | ----------------- | ------------------------------------------ | ------------- |
| `daily_health_check_link_trigger.ts`         | Link Trigger      | 体調チェックフォームを開始する             | 環境ごとに1つ |
| `toggle_survey_subscription_trigger.ts`      | Link Trigger      | 実行したユーザーの定期配信設定を切り替える | 環境ごとに1つ |
| `scheduled_health_check_delivery_trigger.ts` | Scheduled Trigger | 対象ユーザーへ毎日まとめてDMを送る         | 環境ごとに1つ |

ローカル環境と本番環境のトリガーは別物です。ローカルで作成したトリガーは`slack run`の実行中にしか動きません。本番運用では、各コマンドで必ず`(local)`ではないデプロイ済みアプリを選択してください。

### `HEALTH_CHECK_TRIGGER_URL`が必要な理由

Scheduled
Triggerが送るDMには「体調チェックを開始する」ボタンがあります。このボタンの遷移先には、`daily_health_check_link_trigger.ts`から作成したShortcut
URLを指定します。

Shortcut
URLは次の条件で異なるため、ソースコードへ固定せず、環境変数`HEALTH_CHECK_TRIGGER_URL`で管理します。

- Slackワークスペース
- ローカル／本番の実行環境
- 作成したリンクトリガー

環境変数が未設定、または値が`https://slack.com/shortcuts/`で始まらない場合、Scheduled
Triggerは起動してもDM配信ステップがエラーになります。

### 本番環境の初回セットアップ

#### 1. アプリをデプロイする

初回は、リンクトリガーが参照するWorkflowを先に本番環境へデプロイします。

```zsh
slack deploy
```

過去に`delivery_time`、`time_zone`、`scheduled_trigger_id`を含むDatastoreスキーマをデプロイしている環境では、属性削除を反映する最初の1回だけ`slack deploy --force`が必要になる場合があります。

#### 2. 体調チェック用リンクトリガーを作成する

```zsh
slack trigger create --trigger-def triggers/daily_health_check_link_trigger.ts
```

本番のデプロイ済みアプリを選択し、作成後に表示される次の形式のShortcut
URLを控えます。

```text
https://slack.com/shortcuts/...
```

#### 3. Shortcut URLを本番環境へ登録する

```zsh
slack env set HEALTH_CHECK_TRIGGER_URL 'https://slack.com/shortcuts/...'
```

登録先には、手順2でリンクトリガーを作成したものと同じ本番アプリを選択します。登録状態は次のコマンドで確認できます。

```zsh
slack env list
```

一覧に`HEALTH_CHECK_TRIGGER_URL`が表示されることを確認したら、環境変数を反映するため、もう一度デプロイします。

実際のShortcut
URLはREADMEやソースコードへ直接記載せず、本番では`slack env set`、ローカルではGit管理対象外の`.env`に保存してください。

```zsh
slack deploy
```

#### 4. 定期配信設定用リンクトリガーを作成する

```zsh
slack trigger create --trigger-def triggers/toggle_survey_subscription_trigger.ts
```

作成されたURLを実行するたびに、`slack_user_profiles`の現在の`survey_enabled`を反転します。未登録・未設定・`false`の場合は`true`となって定期配信を開始し、`true`の場合は`false`となって停止します。実行結果は本人のDMへ通知されます。

以前の開始用・停止用トリガーを作成済みの場合、定義ファイルを削除してもSlack上のトリガーは自動削除されません。`slack trigger list`で確認し、古い2つのTrigger
IDを指定して削除してから、新しいトリガーを作成してください。

```zsh
slack trigger list
slack trigger delete --trigger-id FtXXXXXXXXXX
```

#### 5. 最初の配信対象ユーザーを登録する

> [!IMPORTANT]
> Scheduled Triggerを作成しただけでは、配信対象ユーザーは登録されません。
> `slack_user_profiles`に`survey_enabled: true`のレコードが1件以上必要です。
> 対象者が0人でもWorkflow自体はエラーにならず、0件配信として正常終了するため、初回セットアップ時は特に注意してください。

通常は、手順4で作成した配信設定用URLをユーザー本人が初めて実行して登録します。すでに配信中のユーザーが再度実行すると停止するため、DMに届く実行結果を確認してください。動作確認のため、Datastoreへ直接登録する場合は、SlackユーザーIDと表示名を実際の値へ置き換えて次のコマンドを実行します。

```zsh
slack datastore put --datastore slack_user_profiles '{"item":{"slack_member_id":"U0123ABCDEF","screen_name":"Example User","survey_enabled":true}}'
```

Windowsで`slack`を実行するとSlackデスクトップアプリが開く環境では、先頭を`slack-cli`に置き換えます。

```powershell
slack-cli datastore put --datastore slack_user_profiles '{"item":{"slack_member_id":"U0123ABCDEF","screen_name":"Example User","survey_enabled":true}}'
```

コマンドの実行時は、定期配信を動かす本番アプリを選択してください。登録後、同じSlackユーザーIDを指定して内容を確認します。

```zsh
slack datastore get --datastore slack_user_profiles '{"id":"U0123ABCDEF"}'
```

出力に`survey_enabled: true`が含まれていれば、定期配信の対象として登録されています。手動登録では`dm_channel_id`を省略できます。初回送信時はSlackユーザーIDを宛先としてDMを開き、送信成功後にDMチャンネルIDが保存されます。

#### 6. 共通Scheduled Triggerを1つ作成する

```zsh
slack trigger create --trigger-def triggers/scheduled_health_check_delivery_trigger.ts
```

同じ本番環境に複数作成すると、同じWorkflowが重複して起動するため、Scheduled
Triggerは1つだけ作成します。作成済みトリガーは次のコマンドで確認できます。

```zsh
slack trigger list
```

### 配信時刻を変更する

配信時刻は`config/delivery.ts`で設定します。初期値は`Asia/Tokyo`の8:00です。

Scheduled
Triggerの実行予定は作成時に確定するため、コードを変更してデプロイするだけでは既存トリガーの時刻は変わりません。既存のScheduled
Triggerを削除し、作り直してください。

```zsh
slack trigger list
slack trigger delete --trigger-id FtXXXXXXXXXX
slack trigger create --trigger-def triggers/scheduled_health_check_delivery_trigger.ts
```

### ローカル環境で確認する場合

ローカル用のShortcut
URLは本番用URLと共用できません。ローカル環境で体調チェック用リンクトリガーを作成し、そのURLをローカルの`.env`へ設定してから`slack run`を再起動します。

```dotenv
HEALTH_CHECK_TRIGGER_URL=https://slack.com/shortcuts/...
```

## データストア

このアプリでは、以下の2つのデータストアを使用して情報を保存します。データストアを利用するには、マニフェストファイルに`datastore:write`および`datastore:read`スコープが必要です。

- `daily_health_logs`: 日々の健康状態の回答を保存します。
- `slack_user_profiles`:
  アンケート参加者のSlackプロファイルと配信設定を保存します。`survey_enabled`が`true`のユーザーだけを定期配信対象とします。

### アンケート参加者の配信設定

`slack_user_profiles`では、既存のプロフィール属性に加えて次の配信設定を管理します。

| 属性                        | 用途                                  |
| --------------------------- | ------------------------------------- |
| `slack_member_id`           | アンケート送信先となるSlackユーザーID |
| `survey_enabled`            | 定期配信の有効・無効                  |
| `dm_channel_id`             | Slack AppとのDMチャンネルID           |
| `last_delivery_date`        | 最後に定期配信した日（YYYY-MM-DD）    |
| `created_at` / `updated_at` | 参加者設定の作成日時・更新日時        |

既存レコードで`survey_enabled`が未設定の場合は、意図しない配信を防ぐため配信対象に含めません。配信設定用ショートカットを実行するたびに現在値を反転し、未登録・未設定・`false`の場合は`true`に、`true`の場合は`false`に変更します。停止時もレコードは削除しません。

参加者別Scheduled
Triggerを前提としていた`delivery_time`、`time_zone`、`scheduled_trigger_id`は使用しません。これらの属性を既にデプロイしている環境では、Datastoreスキーマから削除するため、最初のデプロイ時に`--force`が必要になる場合があります。

### 参加者の登録

通常は`toggle_survey_subscription_trigger.ts`から作成した配信設定用URLをユーザー本人が初めて実行して登録します。この方法では、表示名とSlack
AppとのDMチャンネルIDも自動的に保存されます。登録済みで`survey_enabled`が`true`のユーザーが再度実行すると、定期配信は停止します。

本番環境の初回登録は、[本番環境の初回セットアップの手順5](#5-最初の配信対象ユーザーを登録する)も参照してください。

動作確認などで手動登録する場合は、SlackユーザーIDを指定して次のコマンドを実行できます。

```zsh
slack datastore put --datastore slack_user_profiles '{"item":{"slack_member_id":"U0123ABCDEF","screen_name":"Example User","survey_enabled":true}}'
```

登録結果は主キーとなるSlackユーザーIDで確認します。

```zsh
slack datastore get --datastore slack_user_profiles '{"id":"U0123ABCDEF"}'
```

`datastore put`は、同じ主キーのレコードが存在するとレコード全体を置き換えます。既存レコードへ使用する場合は、先に`datastore get`で現在の内容を確認してください。

`slack_user_profiles`が0件、または`survey_enabled: true`のユーザーが0人の場合、定期配信はエラーになりません。DMを送らず、成功・失敗・スキップがすべて0件として正常終了します。ただし、`HEALTH_CHECK_TRIGGER_URL`の検証は参加者検索より先に行うため、参加者が0人でも環境変数が未設定ならエラーになります。

### CLIからのデータ参照

Slack CLIを使用すると、データストアに保存された値を直接確認できます。
`daily_health_logs`の主キーである`record_id`を指定して、以下のようにコマンドを実行します。`record_id`は`ユーザーID#日付`の形式です。

```zsh
# record_id を指定してdaily_health_logsデータストアから値を取得
slack datastore get --datastore daily_health_logs '{"id":"U0123ABCDEF#2026-06-29"}'
```

```zsh
# record_id を複数指定してdaily_health_logsデータストアから値を一括取得
slack datastore bulk-get '{"datastore":"daily_health_logs","ids":["U0123ABCDEF#2026-06-27","U0123ABCDEF#2026-06-28"]}' --output json
```

JSONのログ

```json
[
  {
    "week_start_date": "2026-06-22",
    "created_at": "2026-06-27T06:51:36.486Z",
    "meal_status": "meal_yes",
    "low_mood_status": "low_mood_absent",
    "message_ts": "1782543071.342989",
    "condition": "condition_excellent",
    "sleep_status": "sleep_good",
    "record_date": "2026-06-27",
    "record_id": "U0123ABCDEF#2026-06-27",
    "day_of_week": "Sat",
    "sleep_score": 1,
    "condition_score": 1,
    "user_id": "U0123ABCDEF",
    "channel_id": "*****",
    "work_style": "work_remote",
    "medication_status": "medication_not_taken"
  },
  {
    "week_start_date": "2026-06-29",
    "created_at": "2026-06-30T04:42:46.352Z",
    "meal_status": "meal_yes",
    "low_mood_status": "low_mood_present",
    "message_ts": "1782794482.717439",
    "condition": "condition_excellent",
    "sleep_status": "sleep_slight",
    "record_date": "2026-06-30",
    "record_id": "U0123ABCDEF#2026-06-30",
    "day_of_week": "Tue",
    "sleep_score": 0.75,
    "condition_score": 1,
    "user_id": "U0123ABCDEF",
    "channel_id": "*****",
    "work_style": "work_remote",
    "medication_status": "medication_taken"
  },
  {
    "week_start_date": "2026-06-22",
    "created_at": "2026-06-28T11:28:42.840Z",
    "meal_status": "meal_yes",
    "low_mood_status": "low_mood_present",
    "message_ts": "1782646095.739859",
    "condition": "condition_excellent",
    "sleep_status": "sleep_slight",
    "record_date": "2026-06-28",
    "record_id": "U0123ABCDEF#2026-06-28",
    "day_of_week": "Sun",
    "sleep_score": 0.75,
    "condition_score": 1,
    "user_id": "U0123ABCDEF",
    "channel_id": "*****",
    "work_style": "work_office",
    "medication_status": "medication_taken"
  },
  {
    "week_start_date": "2026-06-29",
    "created_at": "2026-06-29T07:28:15.408Z",
    "meal_status": "meal_yes",
    "low_mood_status": "low_mood_present",
    "message_ts": "1782718012.854499",
    "condition": "condition_excellent",
    "sleep_status": "sleep_good",
    "record_date": "2026-06-29",
    "record_id": "U0123ABCDEF#2026-06-29",
    "day_of_week": "Mon",
    "sleep_score": 1,
    "condition_score": 1,
    "user_id": "U0123ABCDEF",
    "channel_id": "*****",
    "work_style": "work_office",
    "medication_status": "medication_taken"
  }
]
```

## デプロイ

開発が完了したら、`slack deploy`コマンドを使用してアプリをSlackインフラストラクチャにデプロイします。

```zsh
slack deploy
```

参加者別Scheduled
Trigger用の`delivery_time`、`time_zone`、`scheduled_trigger_id`を含む古いDatastoreスキーマをデプロイ済みの場合は、属性削除を反映する最初の1回だけ`--force`を付けます。

```zsh
slack deploy --force
```

デプロイだけでは、トリガーの作成や`HEALTH_CHECK_TRIGGER_URL`の登録は行われません。初回の本番セットアップでは、[トリガーと本番環境のセットアップ](#トリガーと本番環境のセットアップ)も実施してください。

## アクティビティログの表示

アプリケーションのアクティビティログは、次のコマンドでリアルタイムに表示できます。

```zsh
slack activity --tail
```

## トラブルシューティング

### `HEALTH_CHECK_TRIGGER_URL`のエラーが表示される

Scheduled Triggerが動いている環境にShortcut URLが登録されていません。

```zsh
slack env list
```

本番運用ではデプロイ済みアプリを選び、`HEALTH_CHECK_TRIGGER_URL`が存在することを確認します。存在しない場合は、本番環境で作成した`daily_health_check_link_trigger.ts`のURLを設定して再デプロイしてください。

### 定期実行は成功するがDMが届かない

次の順に確認します。

1. `slack_user_profiles`に対象ユーザーが存在する
2. 対象ユーザーの`survey_enabled`が`true`になっている
3. `last_delivery_date`が今日の日付になっていない
4. `slack activity --tail`に送信エラーが記録されていない

参加者が0人の場合は、DMを送らず正常終了します。初回セットアップ直後であれば、[最初の配信対象ユーザーを登録](#5-最初の配信対象ユーザーを登録する)してから再度確認してください。

### ローカルでは動くが本番では動かない

ローカルと本番ではトリガーとShortcut
URLが異なります。本番環境で3種類のトリガーを作成し、本番用`HEALTH_CHECK_TRIGGER_URL`を登録してください。

### 配信時刻を変更しても以前の時刻に実行される

Scheduled
Triggerの予定は作成時の値を保持します。`config/delivery.ts`を変更してデプロイした後、既存のScheduled
Triggerを削除して作り直してください。

### DMが重複して届く

同じ本番環境にScheduled Triggerが複数作成されていないか確認します。

```zsh
slack trigger list
```

不要なトリガーは、表示されたTrigger IDを指定して削除します。

```zsh
slack trigger delete --trigger-id FtXXXXXXXXXX
```

## プロジェクトの構造

### `manifest.ts`

[アプリマニフェスト](https://api.slack.com/automation/manifest)には、アプリ名、説明、実行するワークフロー、関数、データストア、必要な権限（スコープ）など、アプリの全体的な設定が含まれています。

### `datastores/`

[データストア](https://api.slack.com/automation/datastores)は、Slackインフラストラクチャ上でアプリケーションのデータを安全に保存します。

- `daily_health_logs.ts`:
  日々の健康チェックの回答を格納するデータストアの定義です。
- `slack_user_profiles.ts`:
  Slackユーザーのプロフィールと体調アンケートの配信設定を格納するデータストアの定義です。

### `functions/`

[関数](https://api.slack.com/automation/functions)は、ワークフローのステップとして実行される個別の処理単位です。

- `send_health_check_form.ts`:
  ユーザーに体調チェックの質問をDMで送信する関数です。
- `manage_survey_subscription.ts`:
  ユーザー自身の定期配信設定を反転し、DMチャンネルIDとともに保存する関数です。
- `send_scheduled_health_check_reminders.ts`:
  配信対象を取得し、回答ボタン付きDMをバッチ送信する関数です。
- `save_raw_data.ts`:
  ユーザーからの回答を`daily_health_logs`データストアに保存する関数です。

### `triggers/`

[トリガー](https://docs.slack.dev/tools/deno-slack-sdk/guides/using-triggers/)は、ワークフローをいつ実行するかを定義します。

- `daily_health_check_link_trigger.ts`:
  ユーザーがショートカットをクリックしたときに`DailyHealthCheckWorkflow`を開始するためのトリガー定義です。
- `toggle_survey_subscription_trigger.ts`:
  ユーザー自身が定期配信の開始・停止を切り替えるためのリンクトリガー定義です。
- `scheduled_health_check_delivery_trigger.ts`:
  登録済みユーザーへの一括配信を毎日開始する、ワークスペース共通のScheduled
  Trigger定義です。

### `workflows/`

[ワークフロー](https://api.slack.com/automation/workflows)は、一連のステップ（関数）を順序通りに実行する処理の流れです。

- `daily_health_check_workflow.ts`:
  体調チェックの質問を送信し、回答を保存するという一連の流れを定義したワークフローです。
- `manage_survey_subscription_workflow.ts`:
  現在の定期配信設定を反転して保存するワークフローです。
- `scheduled_health_check_delivery_workflow.ts`:
  登録済みユーザーへの一括配信を実行するワークフローです。

### `.slack/`

開発用およびデプロイ済みアプリのインストール詳細を含む`apps.dev.json`と`apps.json`が含まれています。

### Denoでのチェック

fmt、lint、単体テストをまとめて実行します。

```zsh
$ deno task test
```

単体テストは、既存の `test_` 接頭辞とDenoが自動検出する `_test.ts`
接尾辞を組み合わせて命名しています。

## リソース

Slackでの自動化開発についてさらに学ぶには、以下のリソースをご覧ください。

- [Automation Overview](https://api.slack.com/automation)
- [CLI Quick Reference](https://api.slack.com/automation/cli/quick-reference)
- [Samples and Templates](https://api.slack.com/automation/samples)
- [Block Kit Builder](https://app.slack.com/block-kit-builder/)
- [deno-slack-sdk/issues/276](https://github.com/slackapi/deno-slack-sdk/issues/276)
