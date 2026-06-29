# Daily Health Logs

これは、Slack上で日々の健康状態を記録するためのSlackアプリです。
DenoとSlack CLIを使用して構築されています。

**Guide Outline**:

- [概要](#概要)
- [主な機能](#主な機能)
- [今後の展望](#今後の展望)
- [セットアップ](#セットアップ)
  - [Slack CLIのインストール](#slack-cliのインストール)
  - [リポジトリのクローン](#リポジトリのクローン)
- [ローカルでの実行](#ローカルでの実行)
- [トリガーの作成](#トリガーの作成)
- [データストア](#データストア)
- [デプロイ](#デプロイ)
- [アクティビティログの表示](#アクティビティログの表示)
- [プロジェクトの構造](#プロジェクトの構造)
- [リソース](#リソース)

---

## 概要

このアプリは、Slackのショートカットからワークフローを起動し、ユーザーにDMで体調に関する質問を送信します。ユーザーがBlock Kitで構成されたフォームに回答すると、その内容はSlackがホストするデータストアに安全に保存されます。

個人の健康に関する情報を取り扱うため、やり取りはすべてユーザー個人のDM内で行われ、他のユーザーに情報が見えることはありません。

## 主な機能
<img width="1524" height="996" alt="image" src="https://github.com/user-attachments/assets/689c5bce-2e4a-4037-8f41-d7e6fed39f80" />

-   **体調チェックの開始**: Slackのショートカットメニューから簡単に体調チェックを開始できます。
-   **インタラクティブなUI**: [Block Kit](https://api.slack.com/block-kit)を利用したモダンなUIで、直感的に回答できます。最近ではTable（表形式）やData Visualization（データ可視化）といった新しいコンポーネントも利用可能になり、より表現力豊かなUIを構築できます。
-   **データ保存**: 回答内容はSlackのDatastoreに保存され、後から参照することが可能です。

## 今後の展望

現在はSlackのデータストアに情報を保存していますが、将来的にはGoogle Sheets APIなど外部サービスとの連携も視野に入れています。これにより、記録された健康データをより柔軟に分析・活用できるような構成を目指しています。

## セットアップ

このプロジェクト開発には Deno と Git が必要です。それぞれの公式サイトを参考に、事前にインストールを済ませてください。

-   [Deno公式サイト](https://deno.land/)
-   [Git公式サイト](https://git-scm.com/)

セットアップを開始する前に、アプリをインストールする権限のある開発ワークスペースがあることを確認してください。**このプロジェクトの機能を使用するには、ワークスペースが[Slackの有料プラン](https://slack.com/pricing)の一部である必要があることに注意してください。**

### Slack CLIのインストール

このテンプレートを使用するには、Slack CLIをインストールして設定する必要があります。詳細な手順については、[クイックスタートガイド](https://api.slack.com/automation/quickstart)を参照してください。

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
$ slack run

Connected, awaiting events
```

ローカルでの実行を停止するには、`<CTRL> + C`を押してプロセスを終了します。

> **Note for Windows Users:**
> Windows環境では、環境変数のPATHの優先順位によっては、`slack run`のようなコマンドを実行しようとすると、Slackのデスクトップアプリ(`slack.exe`)が起動してしまう場合があります。
> その場合は、ターミナルで`slack.exe`へのパスよりもSlack CLIへのパスの優先順位が高くなるように設定を調整するか、コマンドをフルパスで指定するなどの対応をご検討ください。

## トリガーの作成

[トリガー](https://api.slack.com/automation/triggers)は、ワークフローを実行するきっかけとなるものです。このアプリでは、ショートカットからワークフローを起動するリンクトリガーを使用します。

プロジェクトを初めて`run`または`deploy`するとき、`triggers/`ディレクトリにトリガー定義が見つかると、CLIがトリガーの作成を促します。

トリガーを手動で作成するには、次のコマンドを使用します。

```zsh
$ slack trigger create --trigger-def triggers/test_trigger.ts
```

コマンドを実行すると、トリガーを作成するワークスペースと環境を選択するよう求められます。ローカル環境で作成されたトリガーは、アプリをローカルで実行している場合にのみ使用できます。作成後、ショートカットURLが発行されるので、それをクリックすることでワークフローが実行されます。

**注意: アプリがローカルで実行されているか、デプロイされていない限り、トリガーはワークフローを実行しません！**

## データストア

このアプリでは、以下の2つのデータストアを使用して情報を保存します。データストアを利用するには、マニフェストファイルに`datastore:write`および`datastore:read`スコープが必要です。

-   `daily_health_logs`: 日々の健康状態の回答を保存します。
-   `slack_user_profiles`: ユーザーのSlackプロファイル情報（現在は未使用）を保存するためのものです。

## デプロイ

開発が完了したら、`slack deploy`コマンドを使用してアプリをSlackインフラストラクチャにデプロイします。

```zsh
$ slack deploy
```

## アクティビティログの表示

アプリケーションのアクティビティログは、次のコマンドでリアルタイムに表示できます。

```zsh
$ slack activity --tail
```

## プロジェクトの構造

### `manifest.ts`

[アプリマニフェスト](https://api.slack.com/automation/manifest)には、アプリ名、説明、実行するワークフロー、関数、データストア、必要な権限（スコープ）など、アプリの全体的な設定が含まれています。

### `datastores/`

[データストア](https://api.slack.com/automation/datastores)は、Slackインフラストラクチャ上でアプリケーションのデータを安全に保存します。
- `daily_health_logs.ts`: 日々の健康チェックの回答を格納するデータストアの定義です。
- `slack_user_profiles.ts`: Slackユーザーのプロファイル情報を格納するデータストアの定義です。

### `functions/`

[関数](https://api.slack.com/automation/functions)は、ワークフローのステップとして実行される個別の処理単位です。
- `send_test_health_check_blocks.ts`: ユーザーに体調チェックの質問をDMで送信する関数です。
- `save_raw_data.ts`: ユーザーからの回答を`daily_health_logs`データストアに保存する関数です。

### `triggers/`

[トリガー](https://api.slack.com/automation/triggers)は、ワークフローをいつ実行するかを定義します。
- `test_trigger.ts`: ユーザーがショートカットをクリックしたときに`TestHealthCheckWorkflow`を開始するためのトリガー定義です。

### `workflows/`

[ワークフロー](https://api.slack.com/automation/workflows)は、一連のステップ（関数）を順序通りに実行する処理の流れです。
- `test_workflow.ts`: 体調チェックの質問を送信し、回答を保存するという一連の流れを定義したワークフローです。

### `.slack/`

開発用およびデプロイ済みアプリのインストール詳細を含む`apps.dev.json`と`apps.json`が含まれています。

## リソース

Slackでの自動化開発についてさらに学ぶには、以下のリソースをご覧ください。

-   [Automation Overview](https://api.slack.com/automation)
-   [CLI Quick Reference](https://api.slack.com/automation/cli/quick-reference)
-   [Samples and Templates](https://api.slack.com/automation/samples)
-   [Block Kit Builder](https://app.slack.com/block-kit-builder/): ブラウザ上でUIをインタラクティブに構築できる公式ツールです。
-   [deno-slack-sdk/issues/276](https://github.com/slackapi/deno-slack-sdk/issues/276): `datastore.get`で発生する型エラーの解決に役立ったIssue。
