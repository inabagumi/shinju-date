# GitHub Copilot Coding Agent セットアップガイド

このドキュメントでは、GitHub Copilot Coding Agentを使用してSHINJU DATEプロジェクトで開発・テストを行うための設定方法を説明します。

## 概要

GitHub Copilot Coding AgentがSupabaseとUpstash Redis (Serverless Redis HTTP)を使って開発やテストができるよう、以下の2つのアプローチを提供しています：

1. **ローカルサービスを使用** - 推奨、本番環境に近い動作
2. **MSW (Mock Service Worker) を使用** - 代替案、セットアップ簡略化

## 自動セットアップ（GitHub Actions）

GitHub Copilot Coding Agentの環境では、`.github/workflows/copilot-setup-steps.yml` ワークフローが以下を自動的に実行します：

1. 依存関係のインストール
2. Supabaseのローカル起動
3. Redisサービスの起動
4. 環境変数の自動設定（Supabaseキーの取得を含む）

**手動でサービスを起動する必要はありません。**

## アプローチ1: ローカルサービスを使用（推奨）

本番環境に近い動作を実現するため、実際のSupabaseとRedisサービスを使用します。

### 特徴

- **本番環境に近い**: 実際のSupabaseとRedisインスタンスを使用
- **完全な機能**: すべてのデータベースとRedis機能が利用可能
- **データ永続化**: 実際のデータ保存と取得
- **正確なテスト**: 本番環境と同じ動作を検証可能

### セットアップ（手動セットアップが必要な場合のみ）

GitHub Actions環境以外で手動セットアップが必要な場合：

#### 1. 環境変数の設定

`.env.local`ファイルを作成：

```bash
cp apps/web/.env.local.sample apps/web/.env.local
cp apps/admin/.env.local.sample apps/admin/.env.local
```

Supabaseキーを取得して設定：

```bash
# Supabaseの状態確認とキー取得
pnpm exec supabase status -o env

# 表示されたANON_KEYとSERVICE_ROLE_KEYを.env.localファイルに設定
```

#### 2. データのインポート（任意）

```bash
# 本番データをインポート
pnpm db:import
```

#### 3. 開発サーバーの起動

```bash
# 全アプリを起動
pnpm run dev

# または特定のアプリのみ
pnpm run dev --filter=web
```

### 停止方法

```bash
# Supabaseを停止
pnpm exec supabase stop

# Redisを停止（Dev Containerを使用していない場合）
cd .devcontainer
docker compose down
```

### トラブルシューティング

#### Supabaseが起動しない

```bash
# ログを確認
supabase status
docker ps

# 完全リセット
supabase stop --no-backup
docker system prune -f
supabase start
```

#### Redisが起動しない

```bash
# ポート確認
lsof -i :8079
lsof -i :6379

# ログ確認
docker logs <container_id>
```

## アプローチ2: MSW (Mock Service Worker) を使用（代替案）

セットアップを簡略化したい場合や、外部サービスなしでテストしたい場合に使用します。

### 特徴

- **セットアップ不要**: Docker、Supabase、Redisのインストール不要
- **高速**: 実際のデータベース接続なし
- **軽量**: AI Agentでの簡易テストに適している
- **完全なモック**: Supabase、Redis、その他のAPIをモック

### セットアップ手順

#### 1. 環境変数の設定

`.env.local`ファイルを編集：

```bash
# MSWを有効化
ENABLE_MSW=true
```

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

`MSW_SUPABASE_AUTHENTICATED`を設定しない場合、以下の認証情報でログイン：

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

## GitHub Copilot Coding Agentへの推奨設定

GitHub Copilot Coding Agentには **ローカルサービスを使用する方法（アプローチ1）** を推奨します。

### ローカルサービス使用時のセットアップ例

```bash
# 1. Supabaseを起動
pnpm exec supabase start

# 2. Redis起動（Dev Container使用時は自動起動）
cd .devcontainer && docker compose up -d

# 3. 環境変数設定（.env.local.sampleから作成）
cp apps/web/.env.local.sample apps/web/.env.local

# 4. 開発サーバー起動
pnpm run dev
```

### MSW使用時のセットアップ例

```bash
# 1. 環境変数設定
echo "ENABLE_MSW=true" >> apps/web/.env.local

# 2. MSW初期化
pnpm --filter './apps/*' run msw:init

# 3. 開発サーバー起動
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

GitHub Copilot Coding Agentには **ローカルサービスを使用する方法（アプローチ1）** を推奨します。理由：

✅ 本番環境に近い動作を確認可能
✅ 完全なデータベースとRedis機能を利用可能
✅ データ永続化により実際のデータフローをテスト可能
✅ 正確な統合テストが実施可能

簡易的なテストや外部依存なしで開発したい場合のみ、MSW（アプローチ2）を使用してください。
