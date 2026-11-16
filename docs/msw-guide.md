# MSW（Mock Service Worker）統合ガイド

このドキュメントでは、SHINJU DATEプロジェクトにおけるMSW（Mock Service Worker）の統合について、セットアップ方法、使用方法、ビルド手順を包括的に説明します。

## 📋 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [使用方法](#使用方法)
- [ビルド方法](#ビルド方法)
- [モックデータ](#モックデータ)
- [トラブルシューティング](#トラブルシューティング)

## 概要

MSW（Mock Service Worker）は、開発・テスト環境でAPIリクエストをモックするためのライブラリです。SHINJU DATEプロジェクトでは、以下の目的で活用しています：

- **開発の効率化**: バックエンドサービスなしで開発可能
- **テストの安定化**: 予測可能なモックデータでE2Eテストを実行
- **バックエンドからの独立**: フロントエンド開発をバックエンドの可用性に依存させない
- **オフライン開発**: インターネット接続なしでも開発可能

### 統合されているパッケージとアプリケーション

#### コアパッケージ (`packages/msw-handlers/`)

- `src/index.ts` - メインエクスポート
- `src/server.ts` - Node.js サーバーセットアップ
- `src/register.ts` - `--import` で読み込む、ビルド時のサーバーセットアップ
- `src/handlers/supabase.ts` - Supabase API モックハンドラー
- `src/handlers/upstash.ts` - Upstash Redis モックハンドラー
- `README.md` - パッケージドキュメント

#### アプリケーション統合

MSWはサーバー側（Node.js）でだけ動かします。Supabase、Upstash、YouTubeなどへのアクセスは、サーバーコンポーネント、Server Action、ルートハンドラーで行っており、ブラウザから直接呼ぶ処理はないためです。ブラウザ側のMSW（`setupWorker()` とサービスワーカー）は使っていません。

- **Web App** (`apps/web/`)、**Admin App** (`apps/admin/`)
  - `instrumentation.ts` - `ENABLE_MSW=true` のとき、`@shinju-date/msw-handlers/server` の `startServer()` でMSWを起動する（Node.jsランタイムのみ）
  - `package.json` の `build:msw` - `@shinju-date/msw-handlers/register` を読み込んで本番ビルドする（[ビルド方法](#ビルド方法)を参照）
- **Batch App** (`apps/batch/`)
  - `instrumentation.ts` - Web/Adminと同じく、`ENABLE_MSW=true` のときにMSWを起動する

## 主な機能

### 1. Supabase APIモック

サポートされているテーブル：

- `videos` - 動画情報
- `channels` - チャンネル情報
- `thumbnails` - サムネイル画像
- `profile_images` - YouTubeチャンネル・Twitchユーザーのアイコン（`youtube_channels`から`profile_images(...)`で埋め込み可能）
- `terms` - 検索用語
- `youtube_videos` - YouTube動画マッピング
- `youtube_channels` - YouTubeチャンネルマッピング
- `twitch_users` - Twitchユーザーマッピング（取得・登録・削除。`talents`から`twitch_users(...)`で埋め込み可能）

サポートされているクエリパラメータ：

- `select` - カラム選択
- `eq` - 等価条件
- `in` - IN条件
- `ilike` - 大文字小文字を区別しないパターン一致
- `limit` - 取得件数制限
- `offset` - オフセット

ネストされたクエリもサポート：

```typescript
const { data } = await supabase
  .from('videos')
  .select('id, title, thumbnails(path, blur_data_url)')
  .limit(10)
```

### 2. Upstash Redisモック

サポートされているコマンド：

- `ZRANGE` - ソート済みセットの範囲取得
- `ZUNIONSTORE` - ソート済みセットの和集合
- `PING` - 接続確認
- `GET` - 値の取得
- `SET` - 値の設定
- `EXPIRE` - 有効期限の設定

パイプラインサポート：

- 単一リクエストで複数のコマンドを実行

事前に準備されたデータ：

- クリック追跡データ (`videos:clicked:*`, `channels:clicked:*`)
- 検索分析データ (`search:popular:*`, `search:volume:*`)
- サマリー統計 (`summary:stats:*`)
- レコメンデーションクエリ (`queries:*`)

### 3. 環境変数による切り替え

- **明示的に有効化**: `ENABLE_MSW=true` のときだけMSWが動作する（開発モードでも、指定しなければ動作しない）
- **ブラウザへの影響なし**: クライアント向けの出力（`.next/static`）にはMSWのコードが含まれない
- **条件付きロード**: `instrumentation.ts` から動的インポートするため、`ENABLE_MSW` を指定しなければ読み込まれない

### 4. TypeScript統合

- **完全な型安全性**: 全てのハンドラーにTypeScript型定義
- **厳格モード対応**: strict TypeScriptチェックをパス
- **IntelliSense**: モックデータ構造のIDE補完サポート

## 使用方法

### 開発サーバー（Web/Admin/Batchアプリ）

[環境変数](#環境変数設定)を設定し、`ENABLE_MSW=true` を付けて開発サーバーを起動します。依存パッケージを先にビルドしておく必要があります。

```bash
pnpm build --filter=@shinju-date/web^...
ENABLE_MSW=true pnpm --filter @shinju-date/web dev
```

`instrumentation.ts` がMSWのサーバーを起動するので、サーバー側のSupabaseやRedisのコードはそのままモックされます：

```typescript
// サーバーコンポーネントやServer Actionの中で
const { data: videos } = await supabase
  .from('videos')
  .select('id, title, thumbnails(path, blur_data_url)')
  .limit(10)
```

ブラウザのコンソールには何も表示されません。開発サーバーを起動したターミナル（標準エラー出力）に、次のメッセージが表示されます：

```
🚀 MSW server started
```

### 管理画面の認証の模擬

`apps/admin` では、MSW のハンドラーが Supabase Auth の認証の流れを模擬します。本物のバックエンドに接続しなくても、認証が必要な画面を確かめられます。認証の状態は、次の2つの方法で切り替えます。

**環境変数で、常に認証済みにする**

`ENABLE_MSW=true` に加えて、`.env.local` などで `MSW_SUPABASE_AUTHENTICATED=true` を設定すると、ログインしなくても、管理者のロールを持つモックのユーザー（`admin@example.com`）として扱われます。画面の表示を素早く確かめたいときに使います。

- セッションの Cookie がない場合は、`apps/admin/lib/supabase/mock-session.ts` がモックのセッションを補います。モックのアクセストークンは MSW のハンドラーしか受け付けないため、本番の認証には影響しません
- ログアウトしても、認証済みのままです。ログイン画面を確かめるときは、この環境変数を設定しないでください

**ログインフォームで認証する**

環境変数を設定しない場合は、実際のアプリと同じように、ログインフォームで認証します。

- メールアドレス: `admin@example.com`
- パスワード: `password123`

ログインすると、認証の状態を保つ Cookie がブラウザに設定されます。ログアウトすると、Cookie は削除されます。

### テスト環境

```typescript
import { server } from '@shinju-date/msw-handlers/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## ビルド方法

### クイックスタート

`apps/web` と `apps/admin` には、MSWを有効にして本番ビルドを行う `build:msw` スクリプトが用意されています。依存パッケージをビルドしてから実行してください。

```bash
pnpm build --filter=@shinju-date/web^...
pnpm --filter @shinju-date/web build:msw
```

`build:msw` は `NODE_OPTIONS="--import @shinju-date/msw-handlers/register"` と `ENABLE_MSW=true` を付けて `next build` を実行します。後述の[環境変数](#環境変数設定)（MSW用のフェイク値）を `.env.local` などで設定しておく必要があります。

CIでも同じスクリプトで `apps/web` と `apps/admin` のビルドを確認しています（`.github/workflows/ci.yml` の `build-msw` ジョブ）。

> [!NOTE]
> `ENABLE_MSW=true` だけでは、ビルド時にMSWが起動しません。`instrumentation.ts` の `register()` はリクエスト処理時にのみ呼ばれ、静的生成のワーカーでは実行されないためです（[仕組み](#仕組み)を参照）。

### 環境変数設定

`.env.local` ファイルに以下の変数を設定：

```env
# MSWを有効化
ENABLE_MSW=true

# Supabase（MSW用のフェイク値）
NEXT_PUBLIC_SUPABASE_ANON_KEY="fake"
NEXT_PUBLIC_SUPABASE_URL="https://fake.supabase.test"

# サービスロールキー（公開サイトと管理画面）
SUPABASE_SERVICE_ROLE_KEY="fake"

# Upstash Redis（MSW用のフェイク値）
UPSTASH_REDIS_REST_TOKEN="fake"
UPSTASH_REDIS_REST_URL="https://fake.upstash.test"
```

### package.jsonスクリプト

`apps/web` と `apps/admin` の `package.json` には、次のスクリプトが定義されています：

```json
{
  "scripts": {
    "build": "next build",
    "build:msw": "NODE_OPTIONS=\"--import @shinju-date/msw-handlers/register\" ENABLE_MSW=true next build"
  }
}
```

### 仕組み

**問題点**

Next.jsはビルド時にワーカースレッドを使用して並列にページを生成します。MSWはネットワークリクエストをインターセプトするために各ワーカースレッドで初期化される必要があります。標準的な`instrumentation.ts`ファイルは静的ページ生成時には実行されません。

**解決策**

`@shinju-date/msw-handlers/register`モジュールは、Node.jsの`--import`フラグを使用してアプリケーションコードの前にMSWをロードします：

1. Node.jsがregisterモジュールを最初にロード（`--import`経由）
2. registerモジュールがMSWサーバーを起動
3. MSWがその後のすべてのネットワークリクエストをインターセプト
4. Next.jsビルドがモックされたAPIで進行

これにより、コードがAPIコールを試みる前にMSWが準備されます。

**ログは標準エラー出力に書く**

`NODE_OPTIONS` は、Next.jsがビルド中に起動する子プロセス（`tsc --showConfig` など）にも引き継がれます。これらの子プロセスの標準出力は機械的に解析されるため、`@shinju-date/msw-handlers` が標準出力にログを書くと解析に失敗し、ビルドが `Could not parse output from TypeScript's --showConfig.` で失敗します。

そのため、`@shinju-date/msw-handlers` のNode.js向けの診断ログは、すべて `console.error`（標準エラー出力）で出力しています。ハンドラーなどにログを追加する場合も `console.log` は使わないでください。

## モックデータ

### Supabaseテーブルのモックデータ例

**Videosテーブル**

```json
{
  "id": "video-uuid-1",
  "title": "サンプル動画 1",
  "duration": "PT10M30S",
  "talent_id": "talent-uuid-1",
  "thumbnail_id": "thumb-uuid-1",
  "visible": true
}
```

### Redisモックデータ例

**クリック追跡**

```
videos:clicked:2023-10-23 => [
  { member: "1", score: 150 },
  { member: "2", score: 120 }
]
```

### ビルド出力

MSWが有効な場合、以下のメッセージが標準エラー出力に表示されます：

```
🎯 MSW Redis mock data initialized with dates: [...]
🚀 MSW server started
✅ MSW server registered via --import flag
```

これらのメッセージはMSWが正常に動作していることを示します。

## トラブルシューティング

### ビルドがDNSエラーで失敗する

`getaddrinfo ENOTFOUND fake.upstash.test`のようなエラーが表示される場合：

- `NODE_OPTIONS`環境変数が正しく設定されているか確認
- `ENABLE_MSW=true`が設定されているか確認
- `@shinju-date/msw-handlers`パッケージがビルドされているか確認

### `"use cache"` のタイムアウトでビルドが失敗する

``Route "/": A `"use cache"` function took too long during prerendering.`` のようなエラーが表示される場合、プリレンダリング中のリクエストがMSWにインターセプトされず、`@shinju-date/retryable-fetch` のリトライで待ち続けています。`ENABLE_MSW=true` だけでなく `NODE_OPTIONS` も設定されているか確認してください（`build:msw` スクリプトを使うと両方設定されます）。

### `Could not parse output from TypeScript's --showConfig.` で失敗する

`NODE_OPTIONS` で読み込んだモジュールが標準出力にログを書いていると、Next.jsが `tsc --showConfig` の出力を解析できずに失敗します。`@shinju-date/msw-handlers` に `console.log` が追加されていないか確認し、`console.error` に置き換えてください（[仕組み](#仕組み)を参照）。

### MSWが起動しない

MSW起動メッセージが表示されない場合：

- Node.jsバージョンが18以上であることを確認（`--import`とトップレベルawaitに必要）
- registerモジュールのパスが正しいか確認
- MSWハンドラーパッケージが正しくビルドされているか確認：

  ```bash
  cd packages/msw-handlers && pnpm run build
  ```

### ポートが既に使用中（開発時）

`EADDRINUSE`エラーが発生する場合：

```bash
# 既存の開発サーバーを終了
pkill -f "next --port"
# 再起動
ENABLE_MSW=true pnpm run dev
```

## 既知の制限事項

### ランタイムでのネストされたFetch

`/images/thumbnails/[id]`ルートには、MSWがネストされたfetchコール（別のfetchハンドラー内から行われるfetchコール）をインターセプトしないという既知の制限があります。これはランタイムの動作にのみ影響し、ビルドには影響しません（ルートが動的なため）。

**影響**: 開発モードでMSWを使用すると、サムネイル画像が正しくロードされない可能性があります  
**回避策**: サムネイル画像をテストする必要がある場合は、開発時にMSWを無効化するか、画像を別の方法でモックしてください

### 動的ルート

動的ルート（ビルド出力で`ƒ`でマークされる）は事前レンダリングされず、ビルド時にMSWを必要としません。これらはリクエスト時にサーバーレンダリングされます。

## ベストプラクティス

1. **CI/CDでMSWを使用**: CIビルドでMSWを有効化し、ライブサービスへの依存を回避
2. **設定を分離**: MSWビルド用と本番ビルド用で異なる`.env`ファイルを使用
3. **実APIでもテスト**: 定期的に実APIでテストし、統合の問題を早期発見
4. **モックを最新に保つ**: APIスキーマが変更されたらMSWハンドラーを更新

## GitHub Copilotとの連携

一貫したモックデータにより、GitHub Copilotがより良いコード補完を提供します：

```typescript
// Copilotはモックレスポンスから構造を理解
const { data: videos } = await supabase.from('videos').select('*')

videos?.forEach((video) => {
  // ✅ Copilotが提案: title, duration, talent_id など
  console.log(video.title)

  // ✅ Copilotはネストされた構造も理解
  console.log(video.thumbnails?.path)
})
```

## セキュリティ

- **脆弱性なし**: CodeQL分析でセキュリティ問題は検出されず
- **ブラウザに配信しない**: MSWのコードはクライアント向けの出力に含まれない
- **型安全性**: 厳格なTypeScriptがランタイムエラーを防止
- **認証情報なし**: モックデータに実際の機密情報は含まれず

## テスト方法

### クイックテスト

1. [開発サーバー](#開発サーバーwebadminbatchアプリ)の手順で、`ENABLE_MSW=true` を付けてwebまたはadminアプリを起動
2. ターミナルに `🚀 MSW server started` が表示されることを確認
3. ページを開き、モックデータが表示されることを確認

## 追加リソース

- [MSWドキュメント](https://mswjs.io/)
- [Supabase REST API](https://supabase.com/docs/reference/rest)
- [Upstash Redis API](https://docs.upstash.com/redis/features/restapi)
- [MSWハンドラーパッケージ README](../packages/msw-handlers/README.md)

## サポート

このガイドでカバーされていない問題が発生した場合：

1. MSWハンドラーのテストスイートで動作例を確認
2. `packages/msw-handlers/src/handlers/`ファイルでハンドラー実装をレビュー
3. 詳細なエラーメッセージと再現手順を含むIssueを作成
