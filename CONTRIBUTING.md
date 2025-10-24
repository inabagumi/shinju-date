# Contributing to SHINJU DATE

SHINJU DATEプロジェクトへの貢献をご検討いただき、ありがとうございます。このドキュメントでは、プロジェクトに貢献するための手順とガイドラインを説明します。

## 開発環境のセットアップ

### 前提条件

- **Node.js**: バージョン 18 以上
- **pnpm**: パッケージマネージャー（`npm install -g pnpm` でインストール）
- **Python**: 3.12 以上（Insights API開発時）
- **uv**: Python依存関係管理（Insights API開発時）

### 初期セットアップ

1. **リポジトリのクローン**

   ```bash
   git clone https://github.com/inabagumi/shinju-date.git
   cd shinju-date
   ```

2. **依存関係のインストール**

   ```bash
   pnpm install
   ```

3. **環境変数の設定**

   各アプリケーションには `.env.local.sample` ファイルがあります。必要に応じて `.env.local` ファイルを作成してください。

   ```bash
   # Web アプリの場合
   cp apps/web/.env.local.sample apps/web/.env.local
   
   # Admin アプリの場合
   cp apps/admin/.env.local.sample apps/admin/.env.local
   ```

4. **MSWサービスワーカーの初期化（必要に応じて）**

   開発環境でAPIモックを使用する場合：

   ```bash
   # Web アプリ
   cd apps/web && pnpm run msw:init
   
   # Admin アプリ
   cd apps/admin && pnpm run msw:init
   ```

5. **Python環境のセットアップ（Insights API開発時）**

   ```bash
   cd apps/insights
   uv sync --extra dev
   ```

### 開発サーバーの起動

```bash
# すべてのアプリケーションを同時に起動
pnpm run dev

# 特定のアプリケーションのみ起動
pnpm run dev --filter=web
pnpm run dev --filter=admin
pnpm run dev --filter=batch

# Insights API (Python)
cd apps/insights && uv run poe dev
```

## コーディング規約

### JavaScript/TypeScript

- **フォーマッター**: Biome を使用
- **リンティング**: Biome の規則に従う
- **型安全性**: TypeScript の厳格な型チェックを使用

### Python（Insights API）

- **フォーマッター**: Ruff を使用
- **リンティング**: Ruff の規則に従う
- **型ヒント**: すべての関数にtype hintsを記載

### コード品質チェック

**重要**: すべてのコード変更後は、必ず以下のコマンドを実行してください。

#### JavaScript/TypeScript

```bash
pnpm run check --fix
```

#### Python（Insights API）

```bash
cd apps/insights
uv run poe format
uv run poe lint
```

### コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) の形式に従ってください：

```
<type>(<scope>): <description>

例:
feat(web): add new video search functionality
fix(admin): resolve authentication issue
docs(readme): update installation instructions
refactor(database): improve query performance
```

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: その他（依存関係更新など）

**Scope**:
- `web`, `admin`, `batch`, `insights`: 各アプリケーション
- `database`, `msw-handlers`, `logger` など: 各パッケージ

## Pull Request のフロー

### 1. ブランチの作成

```bash
git checkout -b feature/your-feature-name
# または
git checkout -b fix/issue-description
```

### 2. 開発とテスト

- 変更を加える
- コード品質チェックを実行
- テストが通ることを確認

```bash
# 品質チェック
pnpm run check --fix

# テスト実行
pnpm run test

# ビルド確認
pnpm run build
```

### 3. Pull Request の作成

- **タイトル**: Conventional Commits形式で記述
- **説明**: 変更内容と理由を明確に記述
- **関連Issue**: `Closes #123` などでIssueと関連付け

### 4. レビュープロセス

- CI/CDが通ることを確認
- コードレビューに対応
- 必要に応じて修正

## Issue の起票ルール

### Issue のタイプ

- **Bug Report**: バグの報告
- **Feature Request**: 新機能の提案
- **Documentation**: ドキュメントの改善
- **Question**: 質問・相談

### Issue テンプレート

Issueを作成する際は、提供されているテンプレートを使用してください：

- **再現手順**: バグの場合は詳細な再現手順
- **期待する動作**: どのような動作を期待するか
- **実際の動作**: 実際に何が起こるか
- **環境情報**: OS、ブラウザ、Node.jsバージョンなど

## テスト

### テストの実行

```bash
# すべてのテスト
pnpm run test

# 特定のパッケージ
pnpm run test --filter=@shinju-date/database

# ウォッチモード
pnpm run test --watch
```

### テストの作成

- **ユニットテスト**: 各関数・コンポーネントのテスト
- **統合テスト**: API エンドポイントや機能の統合テスト
- **E2Eテスト**: 主要なユーザーフローのテスト

## AI エージェントとの協業

このプロジェクトでは GitHub Copilot などの AI ツールを積極的に活用しています。詳細は [AGENTS.md](AGENTS.md) を参照してください。

### MSW（Mock Service Worker）の活用

開発・テスト環境では MSW を使用してAPIをモックします：

```bash
# MSWを有効にする場合
export ENABLE_MSW=true
```

## プロジェクト構成

```
shinju-date/
├── apps/                    # アプリケーション
│   ├── web/                # 公開ウェブサイト
│   ├── admin/              # 管理画面
│   ├── batch/              # バッチ処理
│   └── insights/           # データ分析API
├── packages/               # 共有パッケージ
│   ├── database/           # データベース関連
│   ├── msw-handlers/       # MSW モックハンドラ
│   └── ...
├── docs/                   # プロジェクトドキュメント
├── terraform/              # インフラ定義
└── CONTRIBUTING.md         # このファイル
```

## サポート

### 質問・相談

- **GitHub Issues**: 技術的な質問や提案
- **GitHub Discussions**: 一般的な議論

### ドキュメント

- [docs/](docs/): プロジェクト固有のドキュメント
- [AGENTS.md](AGENTS.md): AI エージェント活用ガイド

## ライセンス

このプロジェクトは [MIT ライセンス](LICENSE) の下で公開されています。

---

ご質問やご不明な点がございましたら、お気軽に Issue を作成してください。皆様の貢献をお待ちしています！