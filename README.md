# SHINJU DATE

[![Node.js CI](https://github.com/inabagumi/shinju-date/workflows/Node.js%20CI/badge.svg)](https://github.com/inabagumi/shinju-date/actions)

「[SHINJU DATE](https://shinju.date/)」は[ななしいんく](https://www.774.ai/)に所属するタレントが[YouTube](https://www.youtube.com/)で配信や投稿した動画を検索できるウェブサービスです。[ななしいんくが定める二次創作ガイドライン](https://www.774.ai/guideline)に従ってななしいんくとは直接の関係がない営利を目的としていない団体である[Haneru Developers](https://haneru.dev/)によって開発と運営が行われています。

## プロジェクト構成

このプロジェクトは、複数のアプリケーションと共有パッケージで構成される monorepo です。

### アプリケーション (`apps/`)

- **[web](apps/web/)** - 公開ウェブサイト (https://shinju.date) のフロントエンド
- **[admin](apps/admin/)** - コンテンツ管理用の管理画面
- **[batch](apps/batch/)** - 定期実行されるバッチ処理 (Nitro)
- **[insights](apps/insights/)** - データ分析や用語集生成などを行う Python ベースの API

### 共有パッケージ (`packages/`)

- **[ui](packages/ui/)** - 共有UIコンポーネント (Button, Input, Dialog, Cardなど)
- **[tailwind-config](packages/tailwind-config/)** - 共有Tailwind CSSテーマ設定（カラーパレット、フォントなど）
- **[database](packages/database/)** - データベース接続と型定義
- **[msw-handlers](packages/msw-handlers/)** - 開発・テスト用 MSW モックハンドラ
- **[youtube-api-client](packages/youtube-api-client/)** - YouTube API クライアント
- **[logger](packages/logger/)** - 共有ログ機能
- **[constants](packages/constants/)** - 共通定数
- **[helpers](packages/helpers/)** - 汎用ユーティリティ関数
- **[health-checkers](packages/health-checkers/)** - ヘルスチェック機能
- **[retryable-fetch](packages/retryable-fetch/)** - リトライ機能付き fetch
- **[temporal-fns](packages/temporal-fns/)** - 日時操作ユーティリティ
- **[youtube-scraper](packages/youtube-scraper/)** - YouTube データスクレイピング

## 技術スタック

- **フロントエンド**: Next.js (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Nitro (Batch), Next.js API Routes (Web/Admin), FastAPI (Python/Insights)
- **データベース**: Supabase (PostgreSQL)
- **キャッシュ**: Upstash Redis
- **パッケージマネージャー**: pnpm
- **モノレポ管理**: Turbo
- **コード品質**: Biome (JavaScript/TypeScript), Ruff (Python)

## 開発を始める

プロジェクトの開発環境をセットアップするには、[docs/setup-guide.md](docs/setup-guide.md) に従ってください。

このガイドには、前提条件、依存関係のインストール、Supabase・Redisのローカル設定、開発サーバーの起動方法などが含まれています。

より詳細な貢献方法については、[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## ドキュメント

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - 開発・貢献ガイド
- **[AGENTS.md](AGENTS.md)** - AI エージェント活用ガイド
- **[docs/](docs/)** - プロジェクト固有のドキュメント
  - [Setup Guide](docs/setup-guide.md) - セットアップガイド（**最初に読むべきドキュメント**）
  - [Coding Guidelines](docs/coding-guidelines.md) - コーディング規約
  - [Testing Guide](docs/testing-guide.md) - テストガイド
  - [MSW Guide](docs/msw-guide.md) - MSW モック統合ガイド
  - [Hybrid Recommendation System](docs/hybrid-recommendation-system.md) - ハイブリッドオススメシステム
  - [Supabase Implementation](docs/supabase-implementation.md) - Supabase実装詳細

## ローカル開発環境

### GitHub Codespaces / Dev Containers

このプロジェクトは [GitHub Codespaces](https://github.com/features/codespaces) および [Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers) に対応しています。

#### Codespaces で開始

1. GitHubリポジトリページで「Code」→「Codespaces」→「Create codespace on main」をクリック
2. 自動的に以下が実行されます：
   - 依存関係のインストール（`pnpm install`）
   - Docker Compose経由でSupabase・Redisサービスが起動
   - パッケージのビルド

#### Supabase ローカル環境

ローカル開発では Docker Compose で管理される Supabase サービスを使用します：

```bash
# Supabaseサービスの起動（.devcontainerディレクトリから）
cd .devcontainer
docker compose up -d

# サービスの状態確認
docker compose ps

# データのインポート（リポジトリルートから）
cd ..
pnpm db:import

# サービスの停止
cd .devcontainer
docker compose down
```

詳細は [セットアップガイド](docs/setup-guide.md) を参照してください。

## コマンド

```bash
# 全アプリケーションの開発サーバー起動
pnpm run dev

# ビルド
pnpm run build

# テスト実行
pnpm run test

# コード品質チェック
pnpm run check --fix
```

## ライセンス

[MIT](LICENSE)

