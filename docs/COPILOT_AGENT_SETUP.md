# GitHub Copilot Coding Agent セットアップガイド

このドキュメントでは、GitHub Copilot Coding Agentを使用してSHINJU DATEプロジェクトで開発・テストを行うための設定方法を説明します。

## 概要

GitHub Copilot Coding AgentがSupabaseとUpstash Redis (Serverless Redis HTTP)を使って開発やテストができるよう、以下の2つのアプローチを提供しています：

1. **MSW (Mock Service Worker) を使用** - 推奨、最も簡単
2. **ローカルサービスを使用** - より本番環境に近い動作

## アプローチ1: MSW (Mock Service Worker) を使用（推奨）

### 特徴

- **セットアップ不要**: Docker、Supabase、Redisのインストール不要
- **高速**: 実際のデータベース接続なし
- **自動化**: AI Agentに最適
- **完全なモック**: Supabase、Redis、その他のAPIをモック

### セットアップ手順

#### 1. 環境変数の設定

`.env.local`ファイルを作成（サンプルから）:

```bash
# アプリルートで実行
cp apps/web/.env.local.sample apps/web/.env.local
cp apps/admin/.env.local.sample apps/admin/.env.local
```

デフォルトで`ENABLE_MSW=true`が設定されているため、追加の設定は不要です。

#### 2. MSWサービスワーカーの初期化

```bash
# MSWサービスワーカーをインストール
pnpm --filter './apps/*' run msw:init
```

#### 3. 開発サーバーの起動

```bash
# 全アプリを起動
pnpm run dev

# または特定のアプリのみ
pnpm run dev --filter=web
pnpm run dev --filter=admin
```

### テストとビルド

```bash
# MSWを有効にしてテスト実行
ENABLE_MSW=true pnpm run test

# MSWを有効にしてビルド（開発用）
ENABLE_MSW=true pnpm run build --filter=web
```

### モックデータについて

MSWは以下のデータを自動的にモックします：

- **Supabase**: 動画、タレント、サムネイル、タグ、チャンネル情報
- **Redis**: クリック追跡、検索人気度、トレンドデータ
- **その他**: YouTube API、Resend（メール送信）

モックデータは `packages/msw-handlers/src/collections.ts` で定義され、`@faker-js/faker`を使用して自動生成されます。

### 認証（管理画面用）

管理画面 (`apps/admin`) で認証が必要な場合：

**方法1: 自動認証**

`.env.local`に以下を追加：

```bash
MSW_SUPABASE_AUTHENTICATED=true
```

**方法2: ログインフォーム使用**

MSW_SUPABASE_AUTHENTICATEDを設定しない場合、以下の認証情報でログイン：

- **Email**: `admin@example.com`
- **Password**: `password123`

### トラブルシューティング

#### MSWが起動しない

```bash
# MSWサービスワーカーを再初期化
pnpm --filter './apps/*' run msw:init
```

#### モックデータが表示されない

1. `.env.local`で`ENABLE_MSW=true`が設定されているか確認
2. ブラウザのコンソールでMSWのログを確認
3. ブラウザを再起動またはキャッシュをクリア

#### ビルドエラー

MSWはビルド時に動作しない場合があります。開発時のみ使用することをお勧めします。

```bash
# MSWなしでビルド
ENABLE_MSW=false pnpm run build --filter=web
```

## アプローチ2: ローカルサービスを使用

より本番環境に近い動作が必要な場合、実際のSupabaseとRedisサービスを起動できます。

### 前提条件

- Docker Desktop がインストールされ、起動していること
- 十分なメモリ（最低8GB推奨）

### セットアップ手順

#### 1. Supabaseの起動

```bash
# Supabaseローカル環境を起動
pnpm exec supabase start

# 状態確認
pnpm exec supabase status
```

起動後、以下の情報が表示されます：

- API URL: `http://127.0.0.1:54321`
- Anon Key: （コンソールに表示）
- Service Role Key: （コンソールに表示）

#### 2. Redisの起動

Dev Containerを使用していない場合：

```bash
cd .devcontainer
docker compose up -d
```

以下のサービスが起動します：

- Redis: `localhost:6379`
- Redis HTTP API: `http://localhost:8079`

#### 3. 環境変数の設定

`.env.local`ファイルを編集：

```bash
# MSWを無効化
ENABLE_MSW=false

# Supabase（実際の値はsupabase statusから取得）
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY_HERE"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"

# Redis
UPSTASH_REDIS_REST_URL="http://localhost:8079"
UPSTASH_REDIS_REST_TOKEN="local_development_token"
```

#### 4. データのインポート（任意）

```bash
# 本番データをインポート
pnpm db:import
```

#### 5. 開発サーバーの起動

```bash
pnpm run dev
```

### 停止方法

```bash
# Supabaseを停止
pnpm exec supabase stop

# Redisを停止（Dev Containerを使用していない場合）
cd .devcontainer
docker compose down
```

## GitHub Copilot Coding Agentへの推奨設定

GitHub Copilot Coding Agentに以下の情報を提供することを推奨します：

### 基本設定

```markdown
## SHINJU DATE開発環境

このプロジェクトは以下の設定で動作します：

### MSWを使用する場合（推奨）
```bash
# 環境変数
ENABLE_MSW=true

# セットアップコマンド
pnpm install
pnpm typegen
pnpm --filter './apps/*' run msw:init

# 開発サーバー起動
pnpm run dev
```

### ローカルサービスを使用する場合
```bash
# 環境変数
ENABLE_MSW=false
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
UPSTASH_REDIS_REST_URL="http://localhost:8079"

# セットアップコマンド
pnpm install
pnpm typegen
pnpm exec supabase start

# 開発サーバー起動
pnpm run dev
```

### 重要なコマンド

```bash
# 型定義生成
pnpm typegen

# コード品質チェック
pnpm run check --fix

# テスト実行
pnpm run test

# ビルド
pnpm run build
```

### プロジェクト構造

- `apps/web/` - 公開ウェブサイト
- `apps/admin/` - 管理画面
- `apps/batch/` - バッチ処理
- `apps/insights/` - Python API
- `packages/msw-handlers/` - MSWモックハンドラー
- `packages/database/` - データベース型定義
```

## CI/CD環境

GitHub ActionsでCopilot Agentのセットアップ手順をテストするワークフローが用意されています：

- `.github/workflows/copilot-setup-steps.yml`

このワークフローは以下を自動化します：

1. 依存関係のインストール
2. Supabaseのローカル起動
3. Redisサービスの起動
4. 環境変数の設定

## 関連ドキュメント

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - 完全なセットアップガイド
- [MSW_INTEGRATION.md](./MSW_INTEGRATION.md) - MSW統合の詳細
- [supabase-local-development.md](./supabase-local-development.md) - Supabaseローカル開発
- [redis-local-development.md](./redis-local-development.md) - Redisローカル開発
- [AGENTS.md](../AGENTS.md) - AIエージェント活用ガイド

## サポート

問題が発生した場合：

1. このドキュメントのトラブルシューティングセクションを確認
2. 関連ドキュメントを参照
3. GitHubのIssueを作成

## まとめ

GitHub Copilot Coding Agentには **MSWを使用する方法（アプローチ1）** を推奨します。理由：

✅ セットアップが簡単で高速
✅ 外部依存関係なし
✅ CI/CD環境と互換性が高い
✅ モックデータが充実している

より本番環境に近い動作確認が必要な場合のみ、ローカルサービス（アプローチ2）を使用してください。
