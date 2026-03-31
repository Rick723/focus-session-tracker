# （開発中）短期集中！ポモちゃん・ドロちゃん育成タイマー
ポモちゃんとドロちゃんを育てながら集中できる、5分間フォーカスタイマーアプリです。
Ruby on Railsで開発しています。

## 🌱 概要

「短期集中！ポモちゃん・ドロちゃん育成タイマー」
は、短時間の集中を「キャラクターの成長」に変換する生産性アプリです。

製作者は作業に手を付けるまでの時間が長いことが悩みでした。
作業の開始に「5分だけ」という小さなきっかけをもたらし、さらに宣言することで回避行動をとらないようにできるポモドーロタイマーを作りたいというコンセプトをもとにしています。

ゲーム感覚でできるように、行動に移した5分を評価する「ドロちゃん」が生まれ、
ポモドーロの区切りの時間として25分到達できたら「ポモちゃん」に成長するという
育成要素を取り入れることを試みています。

---

5分間の集中セッションを完了すると、ドロちゃんが生まれ、
25分到達するとドロちゃんがポモちゃんに成長します。

小さな集中を積み重ねることで、成長を可視化できる設計にしています。

最初の5分間作業に手を付けるとそのまま継続しやすい
という心理慣性と

表明した行動を宣言すると一貫して整合する行動をとりやすい
という

『コミットメントと一貫性の原理』  
— Robert Cialdini

に着想を得た設計を試みています。

---

## ✨ 主な機能

- 短期集中タイマー（5m-25m）
- キャラクター成長システム
- セッション記録機能（アプリ内カレンダーと同期）
- シンプルなUI設計
- タスクの宣言システム（Xシェア機能）

---

## 注意事項

本アプリでは、MVPとしてタイマー機能と履歴管理の実装を優先するため、
ログイン機能は実装しておらず、Cookieを用いた匿名ユーザーによる履歴管理を採用しています。

そのため、以下の状況では履歴が失われる可能性がありますので、あらかじめご了承ください。

- ブラウザの設定や履歴管理からCookieを削除した場合
- シークレットブラウジング（シークレットモードなど）を利用した場合
- 別の端末や別のブラウザからアクセスした場合
- Cookieの有効期限が切れた場合


### ER図
https://dbdiagram.io/d/69a42c26a3f0aa31e16ebe1f



## 🛠 使用技術

- Ruby
- Ruby on Rails
- JavaScript
- mySQl
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

### RSpec 実行

標準手順:

```bash
bin/rspec
```

特定ファイルだけ実行する場合:

```bash
bin/rspec spec/requests/focus_sessions_spec.rb
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
