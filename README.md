# はじめの５分！集中タイマー　-ポモちゃん・ドロちゃん育成記録-

集中の最初の5分を記録し、25分完走までを1セッションとして扱う Rails ミニアプリです。  
匿名ユーザー方式で動作し、タイマー進行は `localStorage`、ユーザー識別は cookie で保持します。

## 概要

- 5分未満で停止したタイマーは保存しません
- 5分到達で `FocusSession` を新規作成、または既存レコードを再利用します
- 25分完了で同じ `FocusSession` に `completed_at` を保存します
- 履歴はカレンダー画面で確認できます

## 現在の仕様

- タイマーは 25分固定です
- 5分到達時に `duration_seconds: 300` を保存します
- 25分完了時に `duration_seconds: 1500` と `completed_at` を更新します
- 同一 user + started_at の重複POSTは既存レコードを再利用します
- 完了済みセッションへの再PATCHは `409 Conflict` を返します
- タイマー稼働中は不整合を避けるため、他画面への導線を非表示にしています

## 匿名ユーザー方式

ログイン機能は持たず、初回アクセス時に匿名ユーザーを自動作成します。

- cookie:
  `anonymous_token` を保持し、同一ブラウザ内のユーザー識別に使います
- localStorage:
  `startedAt`、`focusSessionId`、`postedStartedAt` を保持し、タイマー復元と重複POST防止に使います

cookie が失われると別ユーザーとして扱われるため、過去履歴は引き継がれません。

## 既知の制約

- cookie を削除すると履歴が失われます
- ブラウザや端末をまたぐ履歴共有はできません
- シークレットモードでは履歴保持が安定しません
- タイマー状態の復元は `localStorage` に依存します
- 複数タブの同時操作では、最終防衛はサーバー側の重複防止と conflict 応答に依存します

## 使用技術

- Ruby
- Ruby on Rails
- JavaScript
- MySQL
- HTML / CSS

## Docker 開発手順

このプロジェクトでは、Rails と RSpec を Docker 内で実行する前提に統一します。  
ホスト側では `DATABASE_HOST=db` を名前解決できないため、`bundle exec rspec` を直接ホストで実行しません。

### 初回セットアップ

```bash
bin/docker-setup
```

このスクリプトは以下をまとめて行います。

- `docker compose up -d`
- development DB の `db:prepare`
- test DB の `db:prepare`

### アプリ起動

```bash
docker compose up -d
```

ブラウザで `http://localhost:3000` を開きます。

## 動作確認方法

### 手動確認

- タイマー開始で `Start` が消え、`Stop` が表示される
- 5分未満で停止した場合は保存されない
- 5分到達後に停止した場合は途中記録が残る
- 25分完了で初期状態へ戻る
- カレンダー画面で保存済みセッションを確認できる
- ページ再訪時に `localStorage` からタイマー状態が復元される

### RSpec 実行

標準手順:

```bash
bin/rspec
```

特定ファイルだけ実行する場合:

```bash
bin/rspec spec/requests/focus_sessions_spec.rb
bin/rspec spec/system/timer_navigation_guard_spec.rb
bin/rspec spec/system/timer_completion_flow_spec.rb
```

直接 Docker コマンドを使う場合:

```bash
docker compose exec -e RAILS_ENV=test web bundle exec rspec
```

### test DB の再準備

```bash
docker compose exec -e RAILS_ENV=test web bin/rails db:prepare
```

### 運用ルール

- RSpec はホストではなく Docker 内で実行する
- `docker compose run` ではなく、基本は `docker compose exec web ...` を使う
- 先に `docker compose up -d` で常駐コンテナを起動してから操作する
