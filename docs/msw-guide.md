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
- `src/handlers/supabase.ts` - Supabase API モックハンドラー
- `src/handlers/upstash.ts` - Upstash Redis モックハンドラー
- `README.md` - パッケージドキュメント

#### アプリケーション統合
- **Web App** (`apps/web/`)
  - `lib/msw.ts` - ブラウザ用MSWワーカー
  - `components/msw-provider.tsx` - React MSW初期化コンポーネント
  - `app/msw-demo/page.tsx` - デモページ
- **Admin App** (`apps/admin/`)
  - `lib/msw.ts` - ブラウザ用MSWワーカー
  - `components/msw-provider.tsx` - React MSW初期化コンポーネント
- **Batch App** (`apps/batch/`)
  - `lib/msw.ts` - Node.js バッチ処理用MSWサーバー

## 主な機能

### 1. Supabase APIモック

サポートされているテーブル：
- `videos` - 動画情報
- `channels` - チャンネル情報
- `thumbnails` - サムネイル画像
- `terms` - 検索用語
- `youtube_videos` - YouTube動画マッピング
- `youtube_channels` - YouTubeチャンネルマッピング

サポートされているクエリパラメータ：
- `select` - カラム選択
- `eq` - 等価条件
- `in` - IN条件
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

### 3. 環境に応じた自動起動

- **開発環境のみ**: 開発モードでのみMSWが動作
- **本番環境への影響なし**: 本番ビルドにはMSWのコードが含まれない
- **条件付きロード**: Dynamic importによる最適なバンドル分割

### 4. TypeScript統合

- **完全な型安全性**: 全てのハンドラーにTypeScript型定義
- **厳格モード対応**: strict TypeScriptチェックをパス
- **IntelliSense**: モックデータ構造のIDE補完サポート

## 使用方法

### ブラウザ（Web/Adminアプリ）

開発モードでは自動的にMSWが起動します。既存のSupabaseコードをそのまま使用できます：

```typescript
// 特別な設定は不要 - 開発環境で自動的にモックされる
const { data: videos } = await supabase
  .from('videos')
  .select('id, title, thumbnails(path, blur_data_url)')
  .limit(10)
```

ブラウザコンソールに以下のメッセージが表示されます：
```
🚀 MSW enabled for development
```

### Node.js（Batchアプリ）

```typescript
import { initializeMocking } from '@/lib/msw'

// バッチ処理用にモッキングを開始
initializeMocking()

// Redis/Supabaseコールはモックデータを使用
const result = await redisClient.zrange('videos:clicked:2023-10-23', 0, 10)
```

Node.jsコンソールに以下のメッセージが表示されます：
```
🚀 MSW server started
```

### テスト環境

```typescript
import { server } from '@shinju-date/msw-handlers/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## ビルド方法

### クイックスタート

#### 方法1: Deployment Adapter使用（推奨）

Next.jsのアダプターシステムを使用してMSWを設定：

**ステップ1: `next.config.ts` を更新**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    adapterPath: import.meta.resolve('@shinju-date/msw-handlers/adapter'),
  },
  // ... その他の設定
}

export default nextConfig
```

**ステップ2: MSWを有効にしてビルドまたは開発**

```bash
ENABLE_MSW=true pnpm run build
ENABLE_MSW=true pnpm run dev
```

アダプターは自動的に`NODE_OPTIONS`を設定し、すべてのプロセスとワーカースレッドでMSWをロードします。

#### 方法2: NODE_OPTIONSを直接使用

より明示的な制御が必要な場合、または`next.config.ts`を変更したくない場合：

```bash
NODE_OPTIONS="--import @shinju-date/msw-handlers/register" ENABLE_MSW=true pnpm run build
```

### 環境変数設定

`.env.local` ファイルに以下の変数を設定：

```env
# MSWを有効化
ENABLE_MSW=true

# Supabase（MSW用のフェイク値）
NEXT_PUBLIC_SUPABASE_ANON_KEY="fake"
NEXT_PUBLIC_SUPABASE_URL="https://fake.supabase.test"

# 管理アプリのみ - サービスロールキー
SUPABASE_SERVICE_ROLE_KEY="fake"

# Upstash Redis（MSW用のフェイク値）
UPSTASH_REDIS_REST_TOKEN="fake"
UPSTASH_REDIS_REST_URL="https://fake.upstash.test"
```

### package.jsonスクリプト

MSWサポートを含むスクリプトの例：

```json
{
  "scripts": {
    "build": "next build",
    "build:msw": "NODE_OPTIONS='--import @shinju-date/msw-handlers/register' ENABLE_MSW=true next build",
    "dev": "next dev",
    "dev:msw": "NODE_OPTIONS='--import @shinju-date/msw-handlers/register' ENABLE_MSW=true next dev"
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

MSWが有効な場合、以下のメッセージが表示されます：

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
pnpm run dev:msw
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

videos?.forEach(video => {
  // ✅ Copilotが提案: title, duration, talent_id など
  console.log(video.title)

  // ✅ Copilotはネストされた構造も理解
  console.log(video.thumbnails?.path)
})
```

## セキュリティ

- **脆弱性なし**: CodeQL分析でセキュリティ問題は検出されず
- **開発環境のみ**: MSWコードは本番ビルドから除外
- **型安全性**: 厳格なTypeScriptがランタイムエラーを防止
- **認証情報なし**: モックデータに実際の機密情報は含まれず

## テスト方法

### クイックテスト（ブラウザ）

1. 開発モードでwebまたはadminアプリを起動
2. `/msw-demo`にアクセス（webアプリのみ）
3. ブラウザコンソールでMSW起動メッセージを確認
4. モックデータが表示されることを確認

### 手動テスト

```typescript
// 開発環境では、これがモックデータを返すはずです：
const response = await fetch('/rest/v1/videos?select=id,title&limit=3')
const videos = await response.json()
console.log(videos) // モック動画データが表示されるはず
```

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
