# SHINJU DATE セットアップガイド

このガイドは、SHINJU DATE開発環境をセットアップするための、信頼できる唯一の情報源（Single Source of Truth）です。人間の開発者とAIエージェントの両方を対象としています。

## 前提条件

作業を開始する前に、以下のツールがインストールされていることを確認してください。

- **Node.js**: `.node-version` ファイルで指定されたバージョン。`nvm` などのバージョン管理ツールの使用を推奨します。
- **pnpm**: Corepack を通じて有効化されます。
- **Python**: 3.12 以上 (`apps/insights` 開発時のみ)
- **uv**: Pythonパッケージマネージャー (`apps/insights` 開発時のみ)
- **Docker**: ローカルのSupabase環境を実行するために必要です。
- **Supabase CLI**: ローカルのSupabase環境を管理するために必要です (`npm install -g supabase`)。

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

本番データベースへの影響を避けるため、開発にはローカルのSupabaseスタックを使用します。

### 3.1. Supabaseの起動

このコマンドはDockerを使用してローカルのSupabaseサービスを起動します。

```bash
supabase start
```

`supabase status` コマンドでサービスの稼働状況を確認できます。

### 3.2. 本番データのインポート（任意ですが推奨）

より現実的なデータで開発を進めるため、本番データベースからサニタイズされたスナップショットをインポートできます。

```bash
pnpm db:import
```

詳細は [Supabaseローカル開発ガイド](docs/supabase-local-development.md) を参照してください。

## 4. ローカルRedis環境（自動起動）

Upstash Redisの機能を完全にテストするため、ローカルRedis環境が自動的にセットアップされます。Dev Container（GitHub CodespacesやVS Code Dev Containers）を使用している場合、Redis 8とserverless-redis-httpプロキシが自動的に起動します。

### 4.1. Dev Containerでの自動起動

Dev Containerを使用する場合、以下のサービスが自動的に起動します：

- **Redis 8** (port 6379): ネイティブRedisプロトコル
- **Redis HTTP API** (port 8079): Upstash互換REST API

これらは`.devcontainer/compose.yml`で定義されており、手動での起動は不要です。

### 4.2. ローカルマシンでの手動起動（Dev Containerを使用しない場合）

Dev Containerを使用していない場合は、Docker Composeを使用して手動で起動できます：

```bash
cd .devcontainer
docker compose up -d
```

接続テスト：

```bash
curl -X POST http://localhost:8079 \
  -H "Authorization: Bearer local_development_token" \
  -H "Content-Type: application/json" \
  -d '["PING"]'

# 成功した場合、{"result":"PONG"} が返されます
```

### 4.3. 環境変数

Dev Containerを使用する場合、環境変数は自動的に設定されます。手動で起動する場合は、`.env.local`ファイルで以下を設定してください：

```bash
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=local_development_token
```

### 4.4. 動作しない場合

Docker Composeが動作しない場合は、MSW（Mock Service Worker）を使用してください。MSWは全ての環境で動作する完全なRedisモックを提供し、`.env.local`ファイルのサンプルにはMSW設定も含まれています。

詳細は [Redisローカル開発ガイド](docs/redis-local-development.md) を参照してください。

## 5. 環境変数

このプロジェクトでは、様々なサービスのための環境変数が必要です。ローカル開発、特にMSW (Mock Service Worker) を使用する際は、ダミーの値を使用します。

### 5.1. `.env.local` ファイルの作成

`web` および `admin` アプリのサンプル環境変数ファイルをコピーして、`.env.local` ファイルを作成します。

```bash
cp apps/web/.env.local.sample apps/web/.env.local
cp apps/admin/.env.local.sample apps/admin/.env.local
```

サンプルファイルには、ローカルRedis（`http://localhost:8079`）を使用する設定がデフォルトで含まれています。MSWモックを使用したい場合は、コメントを参照して設定を変更してください。

### 5.2. AIエージェントおよびCI環境で推奨される環境変数

一貫した開発体験のため、特にAIエージェントやCI環境では、以下の環境変数を設定することが推奨されます。前のステップで作成した `.env.local` ファイルには、これらの値がすでに含まれています。

```bash
# MSW
export ENABLE_MSW=true

# Supabase
export NEXT_PUBLIC_SUPABASE_URL=https://fake.supabase.test
export NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon-key
export SUPABASE_SERVICE_ROLE_KEY=fake-service-role-key

# Upstash Redis
export UPSTASH_REDIS_REST_TOKEN=fake-upstash-token
export UPSTASH_REDIS_REST_URL=https://fake.upstash.test

# Next.js Turbopack (特定の環境向け)
export NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1
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
