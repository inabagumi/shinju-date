# SHINJU DATE セットアップガイド

このガイドは、SHINJU DATE開発環境をセットアップするための、信頼できる唯一の情報源（Single Source of Truth）です。人間の開発者とAIエージェントの両方を対象としています。

## 前提条件

作業を開始する前に、以下のツールがインストールされていることを確認してください。

- **Node.js**: `.node-version` ファイルで指定されたバージョン。`nvm` などのバージョン管理ツールの使用を推奨します。
- **pnpm**: Corepack を通じて有効化されます。
- **Python**: 3.12 以上 (`apps/insights` 開発時のみ)
- **uv**: Pythonパッケージマネージャー (`apps/insights` 開発時のみ)
- **Docker**: ローカルのSupabase環境とRedisを実行するために必要です。
- **Docker Compose**: Redisサービスのオーケストレーションに使用します。

**注意**: SupabaseサービスはDocker Composeではなく、`supabase` npm パッケージを通じた Supabase CLI で管理されます（`pnpm exec supabase start`）。個別にSupabase CLIをインストールする必要はありません。

## 1. 初期セットアップ

### 1.1. リポジトリのクローン

```bash
git clone https://github.com/inabagumi/shinju-date.git
cd shinju-date
```

### 1.2. Node.js と pnpm の設定

このプロジェクトは特定のバージョンの Node.js と pnpm を使用します。pnpmのバージョン管理にはCorepackを利用します。

```bash
# package.jsonで定義されたpnpmバージョンを使用するためにCorepackを有効化
corepack enable
```

### 1.3. JavaScript依存関係のインストール

monorepoに必要なすべての依存関係をインストールします。

```bash
pnpm install
```

### 1.4. 内部パッケージのビルド

このステップでは、共有パッケージの型定義ファイル（`.d.ts`）を生成します。これは、TypeScriptの型チェックやエディタの自動補完に不可欠です。

```bash
pnpm typegen
```

## 2. Python環境 (`apps/insights` 向け)

`apps/insights` アプリケーションの開発を行う場合は、Python環境のセットアップが必要です。

### 2.1. Python依存関係のインストール

`uv` を使用して `apps/insights/pyproject.toml` で指定された依存関係をインストールします。

```bash
cd apps/insights
uv sync --extra dev
cd ../.. # ルートディレクトリに戻る
```

## 3. ローカルSupabase環境

本番データベースへの影響を避けるため、開発にはローカルのSupabaseスタックを使用します。SupabaseサービスはSupabase CLI（`pnpm exec supabase`）で管理されます。

### 3.1. Supabaseサービスの起動

Supabase CLIを使用してローカルのSupabaseサービスを起動します。

```bash
pnpm exec supabase start
```

初回起動時は必要なDockerイメージをプルするため、数分かかる場合があります。

このコマンドは以下のサービスを起動します：

- **PostgreSQL** (port 54322): データベース
- **API / Kong** (port 54321): APIゲートウェイ
- **GoTrue** (internal): 認証サービス
- **PostgREST** (internal): REST APIサービス
- **Storage API** (internal): ファイルストレージ
- **Realtime** (internal): リアルタイム機能
- **Inbucket** (port 54324): メールテスト用Webインターフェース
- **Studio** (port 54323): Supabase管理UI

### 3.2. データベースの初期化

マイグレーションとシードデータを適用します：

```bash
pnpm exec supabase db reset
```

### 3.3. サービスの状態確認

サービスが正常に起動しているか確認します：

```bash
pnpm exec supabase status
```

### 3.4. Supabase Studioへのアクセス

ブラウザで [http://localhost:54323](http://localhost:54323) を開くと、Supabase Studioにアクセスできます。ここからデータベースのテーブル、認証ユーザー、ストレージバケットなどを管理できます。

### 3.5. 本番データのインポート（任意ですが推奨）

より現実的なデータで開発を進めるため、本番データベースからサニタイズされたスナップショットをインポートできます。

```bash
# リポジトリのルートディレクトリに戻る
cd ..
pnpm db:import
```

**注意**: 本番データベースからのデータエクスポートは、プロジェクト管理者のみが実行できます。個人情報を含むテーブルのエクスポートは禁止されています。

### 3.6. サービスの停止

開発作業を終了する際は、サービスを停止できます：

```bash
pnpm exec supabase stop
```

データを保持したまま停止する場合は上記コマンドを使用します。データベースやストレージのボリュームを完全に削除する場合は：

```bash
pnpm exec supabase stop --backup
```

## 4. ローカルRedis環境

Upstash Redisの機能を完全にテストするため、ローカルRedis環境がDocker Composeで自動的にセットアップされます。

### 4.1. Redisサービスの起動

Docker Composeを使用してRedisサービスを起動します（Supabaseとは独立して起動します）：

```bash
docker compose up -d
```

このコマンドは以下のサービスを起動します：

- **Redis 8** (port 6379): ネイティブRedisプロトコル
- **Redis HTTP API** (port 8079): Upstash互換REST API

### 4.2. 接続テスト

Redis HTTP APIが正常に動作しているか確認：

```bash
curl -X POST http://localhost:8079 \
  -H "Authorization: Bearer local_development_token" \
  -H "Content-Type: application/json" \
  -d '["PING"]'

# 成功した場合、{"result":"PONG"} が返されます
```

### 4.3. 環境変数

`.env.local`ファイルで以下を設定してください：

```bash
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=local_development_token
```

### 4.4. 動作しない場合

Docker Composeが動作しない場合は、MSW（Mock Service Worker）を使用してください。MSWは全ての環境で動作する完全なRedisモックを提供し、`.env.local`ファイルのサンプルにはMSW設定も含まれています。

詳細は [MSWガイド](msw-guide.md) を参照してください。

## 5. 環境変数

このプロジェクトでは、様々なサービスのための環境変数が必要です。ローカル開発、特にMSW (Mock Service Worker) を使用する際は、ダミーの値を使用します。

### 5.1. `.env.local` ファイルの作成

`web` および `admin` アプリのサンプル環境変数ファイルをコピーして、`.env.local` ファイルを作成します。

```bash
cp apps/web/.env.local.sample apps/web/.env.local
cp apps/admin/.env.local.sample apps/admin/.env.local
```

サンプルファイルには、ローカルRedis（`http://localhost:8079`）とローカルSupabase（`http://localhost:54321`）を使用する設定がデフォルトで含まれています。MSWモックを使用したい場合は、コメントを参照して設定を変更してください。

### 5.2. ローカル開発で推奨される環境変数

Supabase CLI と Docker Compose を使用する場合、以下の環境変数を設定することが推奨されます：

```bash
# Supabase (Supabase CLI経由)
# pnpm exec supabase status -o env で実際の値を確認できます
export NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Upstash Redis (Docker Compose経由)
export UPSTASH_REDIS_REST_TOKEN=local_development_token
export UPSTASH_REDIS_REST_URL=http://localhost:8079

# Next.js Turbopack (特定の環境向け)
export NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1
```

### 5.3. AIエージェントおよびCI環境（MSW使用時）

AIエージェントやCI環境でMSWを使用する場合は、以下の環境変数を設定します：

```bash
# MSW
export ENABLE_MSW=true

# Supabase (MSWモック)
export NEXT_PUBLIC_SUPABASE_URL=https://fake.supabase.test
export NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon-key
export SUPABASE_SERVICE_ROLE_KEY=fake-service-role-key

# Upstash Redis (MSWモック)
export UPSTASH_REDIS_REST_TOKEN=fake-upstash-token
export UPSTASH_REDIS_REST_URL=https://fake.upstash.test
```

## 6. MSWの初期化

Mock Service Worker (MSW) は、開発中にAPIレスポンスをモックするために使用されます。使用するには、サービスワーカースクリプトの初期化が必要です。

```bash
pnpm --filter './apps/*' run msw:init
```

このコマンドにより、`web` および `admin` アプリの `public` ディレクトリに `mockServiceWorker.js` ファイルが作成されます。

## 7. 開発サーバーの起動

これで開発サーバーを起動する準備が整いました。

```bash
# すべてのアプリを同時に起動
pnpm run dev --concurrency 17

# または、特定のアプリのみを起動
pnpm run dev --filter=web
```

お疲れ様でした！これで開発環境のセットアップは完了です。

## トラブルシューティング

### Supabaseサービスが起動しない

Supabase CLIのログを確認：

```bash
pnpm exec supabase logs
```

Supabaseを再起動する場合：

```bash
pnpm exec supabase stop
pnpm exec supabase start
```

### ポートの競合

Supabaseが使用するポート（54321、54322、54323、54324）が既に使用中の場合、`supabase/config.toml`でポートを変更できます。

### データベース接続エラー

1. Supabaseが正常に起動しているか確認：
   ```bash
   pnpm exec supabase status
   ```

2. データベースに直接接続してテスト：
   ```bash
   psql "$(pnpm exec supabase status 2>/dev/null | grep 'DB URL:' | awk '{print $NF}')"
   ```

3. データベースをリセットして再初期化：
   ```bash
   pnpm exec supabase db reset
   ```

### 型定義の生成に失敗

Supabaseが起動していることを確認してから再生成：

```bash
pnpm exec supabase start
pnpm db:schema
```
