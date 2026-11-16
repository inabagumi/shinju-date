# SHINJU DATE

[![CI](https://github.com/inabagumi/shinju-date/actions/workflows/ci.yml/badge.svg)](https://github.com/inabagumi/shinju-date/actions/workflows/ci.yml)

「[SHINJU DATE](https://shinju.date/)」は[ななしいんく](https://www.774.ai/)に所属するタレントが[YouTube](https://www.youtube.com/)で配信や投稿した動画を検索できるウェブサービスです。[ななしいんくが定める二次創作ガイドライン](https://www.774.ai/guideline)に従ってななしいんくとは直接の関係がない営利を目的としていない団体である[Haneru Developers](https://haneru.dev/)によって開発と運営が行われています。

## プロジェクト構成

このプロジェクトは、複数のアプリケーションと共有パッケージで構成される monorepo です。

### アプリケーション (`apps/`)

- **[web](apps/web/)** - 公開ウェブサイト (https://shinju.date) のフロントエンド
- **[admin](apps/admin/)** - コンテンツ管理用の管理画面
- **[batch](apps/batch/)** - 定期実行されるバッチ処理

### 共有パッケージ (`packages/`)

- **[constants](packages/constants/)** - 共通の定数
- **[database](packages/database/)** - Supabase のクライアントとデータベースの型定義
- **[health-checkers](packages/health-checkers/)** - ヘルスチェック機能
- **[helpers](packages/helpers/)** - 汎用のユーティリティ関数
- **[logger](packages/logger/)** - 共有のログ機能
- **[msw-handlers](packages/msw-handlers/)** - 開発とテストで使う MSW のモックハンドラー
- **[retryable-fetch](packages/retryable-fetch/)** - リトライ機能付きの fetch
- **[scraper](packages/scraper/)** - YouTube と Twitch の動画をデータベースと同期するクローラー
- **[tailwind-config](packages/tailwind-config/)** - 共有の Tailwind CSS のテーマ設定
- **[temporal-fns](packages/temporal-fns/)** - `Temporal` を使った日時操作のユーティリティ
- **[twitch-api-client](packages/twitch-api-client/)** - Twitch Helix API のクライアント
- **[ui](packages/ui/)** - 共有の UI コンポーネント（Button、Input、Dialog、Card など）
- **[video-backfill](packages/video-backfill/)** - 過去の動画の取り込みジョブのキュー
- **[web-cache](packages/web-cache/)** - 公開サイトのキャッシュを再検証するユーティリティ
- **[youtube-api-client](packages/youtube-api-client/)** - YouTube Data API のクライアント

## 技術スタック

- **フロントエンド**: Next.js (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Next.js のルートハンドラー、Server Actions
- **データベース**: Supabase (PostgreSQL)
- **キャッシュ**: Upstash Redis
- **パッケージマネージャー**: pnpm
- **モノレポ管理**: Turborepo
- **コード品質**: Biome (JavaScript/TypeScript)

## 開発を始める

詳しい手順は、[セットアップガイド](docs/setup-guide.md)を読んでください。

```bash
# 依存関係のインストール
pnpm install

# Supabase の起動と、マイグレーションとシードの適用
pnpm exec supabase start
pnpm exec supabase db reset

# Redis の起動
docker compose up -d

# 開発サーバーの起動
pnpm dev
```

[GitHub Codespaces](https://github.com/features/codespaces) と [Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers) では、依存関係のインストール、Supabase と Redis の起動が自動で実行されます。

## コマンド

```bash
# 全アプリケーションの開発サーバー起動
pnpm run dev

# ビルド
pnpm run build

# テスト実行
pnpm run test

# 型チェック
pnpm run typecheck

# コード品質チェック
pnpm run check --fix
```

## ドキュメント

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - 開発・貢献ガイド
- **[docs/](docs/)** - プロジェクト固有のドキュメント
  - [Setup Guide](docs/setup-guide.md) - セットアップガイド（**最初に読むべきドキュメント**）
  - [Coding Guidelines](docs/coding-guidelines.md) - コーディング規約
  - [Design Guidelines](docs/design-guidelines.md) - デザインガイドライン
  - [Testing Guide](docs/testing-guide.md) - テストガイド
  - [E2E Testing](docs/e2e-testing.md) - E2E テストガイド
  - [MSW Guide](docs/msw-guide.md) - MSW モック統合ガイド
  - [Agent Skills](docs/agent-skills.md) - AI エージェント向けの Next.js の公式スキル
  - [Hybrid Recommendation System](docs/hybrid-recommendation-system.md) - ハイブリッドオススメシステム

## ライセンス

[MIT](LICENSE)
