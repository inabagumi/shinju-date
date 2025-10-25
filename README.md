# SHINJU DATE

[![Node.js CI](https://github.com/inabagumi/shinju-date/workflows/Node.js%20CI/badge.svg)](https://github.com/inabagumi/shinju-date/actions)

「[SHINJU DATE](https://shinju.date/)」は[ななしいんく](https://www.774.ai/)に所属するタレントが[YouTube](https://www.youtube.com/)で配信や投稿した動画を検索できるウェブサービスです。[ななしいんくが定める二次創作ガイドライン](https://www.774.ai/guideline)に従ってななしいんくとは直接の関係がない営利を目的としていない団体である[Haneru Developers](https://haneru.dev/)によって開発と運営が行われています。

## プロジェクト構成

このプロジェクトは、複数のアプリケーションと共有パッケージで構成される monorepo です。

### アプリケーション (`apps/`)

- **[web](apps/web/)** - 公開ウェブサイト (https://shinju.date) のフロントエンド
- **[admin](apps/admin/)** - コンテンツ管理用の管理画面
- **[batch](apps/batch/)** - 定期実行されるバッチ処理
- **[insights](apps/insights/)** - データ分析や用語集生成などを行う Python ベースの API

### 共有パッケージ (`packages/`)

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
- **バックエンド**: Next.js API Routes, FastAPI (Python)
- **データベース**: Supabase (PostgreSQL)
- **キャッシュ**: Upstash Redis
- **パッケージマネージャー**: pnpm
- **モノレポ管理**: Turbo
- **コード品質**: Biome (JavaScript/TypeScript), Ruff (Python)

## 開発を始める

### 前提条件

- **Node.js**: 18 以上
- **pnpm**: `npm install -g pnpm`
- **Python**: 3.12 以上 (Insights API 開発時)
- **uv**: Python 依存関係管理 (Insights API 開発時)

### セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/inabagumi/shinju-date.git
cd shinju-date

# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm run dev

# 特定のアプリのみ起動
pnpm run dev --filter=web
```

詳細な開発手順は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## ドキュメント

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - 開発・貢献ガイド
- **[AGENTS.md](AGENTS.md)** - AI エージェント活用ガイド
- **[docs/](docs/)** - プロジェクト固有のドキュメント
  - [MSW Integration](docs/MSW_INTEGRATION.md) - MSW モック統合の詳細
  - [Hybrid Recommendation System](docs/hybrid-recommendation-system.md) - ハイブリッドオススメシステム

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

