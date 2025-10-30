# MSW Demo App

MSW（Mock Service Worker）統合を実際に動作させる実演用のデモアプリケーションです。

## 概要

このアプリケーションは、SHINJU DATEプロジェクトにおけるMSW統合の動作確認と、開発者がMSWの使い方を学ぶためのリファレンス実装として機能します。

**主な目的:**
- MSWの動作確認とデバッグ
- `@shinju-date/msw-handlers` パッケージの統合デモ
- Supabase および Upstash Redis のモックAPI動作の検証
- 開発者向けのリファレンス実装

## 構成

このアプリは Next.js (App Router) で構築され、MSW統合の基本要素を含んでいます:

- **Next.js 16**: React 19 と App Router を使用
- **TypeScript**: 型安全な開発環境
- **Tailwind CSS 4**: スタイリング（最小限）
- **MSW 2.x**: APIモック機能
- **@shinju-date/msw-handlers**: 共有モックハンドラー

### ファイル構成

```
apps/msw-demo/
├── app/
│   ├── _components/
│   │   └── msw-provider.tsx    # MSWをブラウザで初期化するプロバイダー
│   └── layout.tsx               # ルートレイアウト（最小限）
├── lib/
│   ├── msw.ts                   # MSWワーカーのセットアップ
│   ├── supabase.ts              # Supabaseクライアント
│   └── redis.ts                 # Redisクライアント
├── instrumentation.ts           # Next.js インストゥルメンテーション（サーバー側MSW）
├── next.config.ts               # Next.js設定
└── package.json                 # 依存関係とスクリプト
```

## セットアップ

### 前提条件

- Node.js 18以上
- pnpm がインストールされていること
- モノレポのルートで `pnpm install` が実行済みであること

### 依存パッケージのビルド

msw-demoを実行する前に、依存するパッケージをビルドする必要があります:

```bash
# モノレポのルートから
cd shinju-date

# 必要なパッケージをビルド
pnpm run build --filter=@shinju-date/database
pnpm run build --filter=@shinju-date/msw-handlers
```

### MSWサービスワーカーの初期化

初回実行時、または `public/mockServiceWorker.js` が存在しない場合:

```bash
cd apps/msw-demo
pnpm run msw:init
```

このコマンドは MSW のサービスワーカーファイルを `public/` ディレクトリに生成します。

**注意**: `mockServiceWorker.js` は `.gitignore` に含まれており、各開発者が個別に生成する必要があります。

## 開発

### 開発サーバーの起動

```bash
cd apps/msw-demo
pnpm run dev
```

アプリケーションは http://localhost:10000 で起動します。

### ビルド

```bash
cd apps/msw-demo
pnpm run build
```

### プロダクションモードで起動

```bash
cd apps/msw-demo
pnpm run start
```

## 環境変数

このデモアプリを実行するには、以下の環境変数を設定する必要があります。すべて **ダミー値** で問題ありません（MSWによってモックされるため、実際のAPIには接続されません）:

```bash
export NEXT_PUBLIC_SUPABASE_URL=https://fake.supabase.test
export NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon-key
export SUPABASE_SERVICE_ROLE_KEY=fake-service-role-key
export UPSTASH_REDIS_REST_TOKEN=fake-upstash-token
export UPSTASH_REDIS_REST_URL=https://fake.upstash.test
```

または、`.env.local` ファイルを作成して設定することもできます:

```bash
# apps/msw-demo/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://fake.supabase.test
NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon-key
SUPABASE_SERVICE_ROLE_KEY=fake-service-role-key
UPSTASH_REDIS_REST_TOKEN=fake-upstash-token
UPSTASH_REDIS_REST_URL=https://fake.upstash.test
```

## MSW統合の仕組み

### ブラウザ環境（クライアントサイド）

1. **MSWProvider**: `app/_components/msw-provider.tsx`
   - クライアントコンポーネントとして動作
   - `useEffect` で MSW ワーカーを起動
   - ブラウザのサービスワーカーとして動作

2. **MSWワーカー**: `lib/msw.ts`
   - `setupWorker()` でワーカーを設定
   - `allHandlers` から全てのモックハンドラーをインポート
   - ブラウザの fetch リクエストをインターセプト

### サーバー環境（Node.js）

1. **Instrumentation**: `instrumentation.ts`
   - Next.js の実験的機能
   - サーバーサイドで MSW を起動
   - `@shinju-date/msw-handlers/server` を使用
   - Node.js の fetch/http リクエストをモック

### モックハンドラー

すべてのモックハンドラーは `@shinju-date/msw-handlers` パッケージから提供されます:

- **Supabase REST API**: `videos`, `channels`, `thumbnails`, `terms` テーブル
- **Upstash Redis API**: `ZRANGE`, `ZUNIONSTORE`, `GET`, `SET` など

詳細は [`packages/msw-handlers/README.md`](../../packages/msw-handlers/README.md) を参照してください。

## 使用例

### Supabase クエリのテスト

```typescript
// lib/supabase.ts のクライアントを使用
import { supabaseClient } from '@/lib/supabase'

// モックデータを取得
const { data: videos } = await supabaseClient
  .from('videos')
  .select('id, title, thumbnails(path, blur_data_url)')
  .limit(10)

// MSW がモックレスポンスを返す
console.log(videos)
```

### Redis 操作のテスト

```typescript
// lib/redis.ts のクライアントを使用
import { redisClient } from '@/lib/redis'

// モックデータを取得
const clickedVideos = await redisClient.zrange(
  'videos:clicked:2023-10-23',
  0,
  10,
  { rev: true, withScores: true }
)

// MSW がモックレスポンスを返す
console.log(clickedVideos)
```

## デバッグ

### ブラウザコンソール

MSWが正常に起動すると、ブラウザのコンソールに以下のメッセージが表示されます:

```
🚀 MSW enabled
```

エラーが発生した場合:
```
❌ MSW failed to start. If you see a 404 error for mockServiceWorker.js, run:
   pnpm run msw:init
   Or see AGENTS.md for setup instructions.
```

### サーバーコンソール

サーバーサイドでMSWが起動すると:

```
🚀 MSW server started
```

### リクエストのモニタリング

MSWの設定で `onUnhandledRequest: 'warn'` が有効なため、モックされていないリクエストは警告として表示されます。これにより、どのリクエストがモックされているかを確認できます。

## 他のアプリケーションへの統合

このデモアプリの実装は、他のアプリ（`web`, `admin`, `batch`）にMSWを統合する際のリファレンスとして使用できます。

### 統合手順

1. **MSW依存関係の追加**:
   ```json
   {
     "devDependencies": {
       "msw": "2.11.6",
       "@shinju-date/msw-handlers": "workspace:*"
     }
   }
   ```

2. **ブラウザ用のMSWセットアップ**:
   - `lib/msw.ts` をコピー
   - `app/_components/msw-provider.tsx` をコピー
   - レイアウトで環境変数に応じて有効化

3. **サーバー用のMSWセットアップ**:
   - `instrumentation.ts` をコピー
   - `next.config.ts` で experimental instrumentation を有効化

詳細は [AGENTS.md](../../AGENTS.md) の「MSW (Mock Service Worker) の有効化」セクションを参照してください。

## トラブルシューティング

### mockServiceWorker.js が見つからない

**エラー**: ブラウザで 404 エラーが発生する

**解決策**:
```bash
cd apps/msw-demo
pnpm run msw:init
```

### MSWが起動しない

**原因**: 依存パッケージがビルドされていない

**解決策**:
```bash
# ルートディレクトリから
pnpm run build --filter=@shinju-date/database
pnpm run build --filter=@shinju-date/msw-handlers
```

### モックデータが返ってこない

**確認事項**:
1. ブラウザコンソールで MSW の起動メッセージを確認
2. リクエストURLがモックハンドラーのパターンと一致しているか確認
3. `@shinju-date/msw-handlers` の最新版がビルドされているか確認

## 関連ドキュメント

- **[@shinju-date/msw-handlers](../../packages/msw-handlers/README.md)**: モックハンドラーパッケージの詳細
- **[MSW Integration](../../docs/MSW_INTEGRATION.md)**: MSW統合の全体的なドキュメント
- **[AGENTS.md](../../AGENTS.md)**: AI エージェントとの協業ガイド（MSW設定を含む）
- **[MSW公式ドキュメント](https://mswjs.io/)**: MSW の詳細な使用方法

## コントリビューション

このデモアプリに変更を加える場合:

1. **最小限の変更**: デモの目的に必要な機能のみを含める
2. **ドキュメントの更新**: 新しい機能や変更点をこのREADMEに反映
3. **コード品質チェック**: 変更後は必ず以下を実行
   ```bash
   pnpm run check --fix
   ```

## ライセンス

MIT
