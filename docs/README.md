# ドキュメント

このディレクトリには、SHINJU DATE プロジェクトの技術ドキュメントが含まれています。

## 📖 ドキュメント一覧

### 🚀 はじめに

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - 開発環境のセットアップ手順（**最初に読むべきドキュメント**）
- **[../CONTRIBUTING.md](../CONTRIBUTING.md)** - 開発・貢献ガイド
- **[../AGENTS.md](../AGENTS.md)** - AI エージェント活用ガイド

### 📝 開発ガイドライン

- **[CODING_GUIDELINES.md](CODING_GUIDELINES.md)** - コーディング規約とベストプラクティス
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - テスト実装ガイド
- **[E2E_TESTING.md](E2E_TESTING.md)** - E2Eテストガイド

### 🔧 技術ガイド

- **[MSW_GUIDE.md](MSW_GUIDE.md)** - MSW (Mock Service Worker) 統合ガイド
- **[SUPABASE_IMPLEMENTATION.md](SUPABASE_IMPLEMENTATION.md)** - Supabase 実装の詳細
- **[web-cache-revalidation.md](web-cache-revalidation.md)** - Web キャッシュの再検証戦略
- **[hybrid-recommendation-system.md](hybrid-recommendation-system.md)** - ハイブリッドオススメクエリシステム
- **[SCRAPER_API_REDESIGN.md](SCRAPER_API_REDESIGN.md)** - Scraper API の再設計

### 🛠️ 運用・トラブルシューティング

- **[maintenance-mode.md](maintenance-mode.md)** - メンテナンスモード
- **[REDIS_KNOWN_ISSUES.md](REDIS_KNOWN_ISSUES.md)** - Redis 既知の問題

### 📦 その他のドキュメント

- **[archive/](archive/)** - 過去の実装ノート（歴史的な参考資料）
- **[各アプリ・パッケージの README](../)** - 個別コンポーネントの詳細

## 🎯 ドキュメントの使い方

### 新しい開発者向けのステップ

1. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - 開発環境のセットアップ（必読）
2. **[../CONTRIBUTING.md](../CONTRIBUTING.md)** - コントリビューションの流れとルール
3. **[CODING_GUIDELINES.md](CODING_GUIDELINES.md)** - コーディング規約を理解
4. **[../AGENTS.md](../AGENTS.md)** - AI ツールの効果的な活用方法
5. **[MSW_GUIDE.md](MSW_GUIDE.md)** - 開発時のモック環境の理解

### 機能開発時

1. **[CODING_GUIDELINES.md](CODING_GUIDELINES.md)** - コーディング規約の確認
2. **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - テストの書き方
3. **[E2E_TESTING.md](E2E_TESTING.md)** - E2Eテストの実装

### システム理解・拡張

1. **[hybrid-recommendation-system.md](hybrid-recommendation-system.md)** - オススメシステムのアルゴリズム
2. **[SUPABASE_IMPLEMENTATION.md](SUPABASE_IMPLEMENTATION.md)** - データベース実装の詳細
3. **各パッケージの README** - 個別コンポーネントの詳細仕様

## 📝 ドキュメント作成ガイドライン

新しいドキュメントを作成する際は、以下の点にご注意ください：

- **日本語で記述**: すべてのドキュメントは日本語で記述してください
- **対象読者を明確にする**: 開発者向け、システム管理者向けなど
- **実行可能な例を含める**: コードサンプルやコマンド例を記載
- **関連ドキュメントへのリンク**: 他のドキュメントとの関連性を明示
- **適切な配置**: 
  - 現在のプロジェクトに関連する内容 → `docs/` 直下
  - 過去の実装記録 → `docs/archive/`

ドキュメントの改善提案は、Issue や Pull Request でお寄せください。