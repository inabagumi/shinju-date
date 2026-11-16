# Contributing to SHINJU DATE

SHINJU DATEプロジェクトへの貢献をご検討いただき、ありがとうございます。このドキュメントでは、プロジェクトに貢献するための手順とガイドラインを説明します。

## 開発環境のセットアップ

**重要**: 開発環境のセットアップ手順は、[docs/setup-guide.md](docs/setup-guide.md) に集約されています。作業を開始する前に、必ずこのガイドを参照してください。

このガイドには、前提条件、依存関係のインストール、Supabaseのローカル設定、開発サーバーの起動方法などが含まれています。

## Dev Container設定の開発とデバッグ

Dev Container設定（`.devcontainer/`）を変更する場合は、`@devcontainers/cli`を使用してローカルでテストしてください。

### Dev Containers CLIのインストール

```bash
npm install -g @devcontainers/cli
```

### Dev Container設定のテスト

```bash
# Dev Containerをビルドしてテスト
devcontainer up --workspace-folder .

# Dev Container内でコマンドを実行
devcontainer exec --workspace-folder . pnpm install

# Dev Containerを停止
devcontainer down --workspace-folder .
```

### 変更すべき設定ファイル

- `.devcontainer/devcontainer.json` - Dev Container本体の設定
- `.devcontainer/compose.override.yml` - Dev Container専用サービス（appのみ）
- `compose.yml`（ルート） - Supabase、Redis等の共有サービス
- `config/` - Kong、Vector等の設定ファイル

詳細は[.devcontainer/README.md](.devcontainer/README.md)を参照してください。

## コーディング規約

### JavaScript/TypeScript

- **フォーマッター**: Biome を使用
- **リンティング**: Biome の規則に従う
- **型安全性**: TypeScript の厳格な型チェックを使用
- **型定義**: オブジェクト型には [`interface` を優先使用](docs/coding-guidelines.md#typescript-型定義)

### コード品質チェック

**重要**: すべてのコード変更後は、必ず以下のコマンドを実行してください。

#### JavaScript/TypeScript

```bash
pnpm run check --fix
```

#### 型チェック

Vitest はテストを実行する際に型を検査せず、パッケージのビルド（tsdown）も型を検査しません（型エラーがあってもビルドは通ります）。型エラーを検出するため、TypeScript のコードを変更した後は型チェックも実行してください。

```bash
# すべてのパッケージとアプリケーション
pnpm run typecheck

# 特定のパッケージ
pnpm run typecheck --filter=@shinju-date/msw-handlers
```

- 各パッケージ・アプリケーションの `typecheck` スクリプト（`tsc --noEmit`）を Turborepo 経由で実行します
- 依存パッケージのビルド（`^build`）と、Next.js のアプリケーションでは `next typegen` による型の生成（`PageProps`、`LayoutProps`、`RouteContext` など）を先に実行します
- 新しいパッケージやアプリケーションを追加した場合は、`package.json` に `"typecheck": "tsc --noEmit"` を追加してください

### コードの決まり

コードの決まりは [コーディングガイドライン](docs/coding-guidelines.md) と [デザインガイドライン](docs/design-guidelines.md) にまとめています。特に次の決まりは、必ず守ってください。

- [TypeScript 型定義](docs/coding-guidelines.md#typescript-型定義): オブジェクトの型には `interface` を使う
- [キャッシュのディレクティブ](docs/coding-guidelines.md#キャッシュのディレクティブ): `'use cache'` と、キャッシュ設定の並びの後に、空行を1行入れる
- [Partial Prerendering](docs/coding-guidelines.md#partial-prerendering): ページ全体を Suspense で囲まず、`params` は Suspense の中の部品で await する
- [Redis のキー](docs/coding-guidelines.md#redis-のキー): `REDIS_KEYS` に定義し、TTL を付ける
- [時刻の扱い](docs/coding-guidelines.md#時刻の扱い): `Date` ではなく `Temporal` を使い、データベースには `toDBString` で保存する
- [admin の Server Action の認証](docs/coding-guidelines.md#admin-の-server-action-の認証): 先頭で `requireAuthenticatedUser()` を呼ぶ
- [管理者のロールと RLS](docs/coding-guidelines.md#管理者のロールと-rls): ポリシーの条件に `public.is_admin()` を使う

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

- `web`, `admin`, `batch`: 各アプリケーション
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

# 型チェック
pnpm run typecheck

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
  - **Lint**: コード品質チェック（Biome）が成功すること
  - **Typecheck**: テストファイルを含めた型チェック（`tsc`）が成功すること
  - **Test**: テストが全て成功すること
  - **Build**: 全てのパッケージとアプリケーションがビルドできること
  - **Database**: データベースを変えた場合、マイグレーションの適用、pgTAP のテスト、生成される型の確認が成功すること
- コードレビューに対応
- 必要に応じて修正

#### CI/CD の構成

Node.js CI は以下のジョブ構成になっています：

1. **Install Dependencies** - 依存関係の検証
   - `pnpm install --frozen-lockfile` を実行し、pnpm のキャッシュを有効化
   - 他の全てのジョブの前提条件として機能

2. **Lint** - コード品質チェック（並列実行）
   - Install Dependencies 成功後に実行
   - pnpm のキャッシュを使用して高速にインストール
   - Biomeによるフォーマットとリンティングを実行

3. **Typecheck** - 型チェック（並列実行）
   - Install Dependencies 成功後に実行
   - pnpm のキャッシュを使用して高速にインストール
   - `pnpm typecheck` でテストファイルを含めた全てのパッケージとアプリケーションの型を検査

4. **Test** - テスト実行（並列実行）
   - Install Dependencies 成功後に実行
   - pnpm のキャッシュを使用して高速にインストール
   - ユニットテストを実行

5. **Build** - ビルド確認（並列実行）
   - Install Dependencies 成功後に実行
   - pnpm のキャッシュを使用して高速にインストール
   - 全てのパッケージとアプリケーションがビルドできることを確認

6. **E2E Tests** - エンドツーエンドテスト
   - Test と Build の両方が成功した場合に実行
   - 現在は準備中（将来的に追加予定）

7. **Database** - データベースの確認
   - `supabase/`、`packages/database/`、`scripts/generate-types.sh`、ルートの `package.json` を変えた場合だけ実行（**Detect Changes** ジョブが判定）
   - `pnpm exec supabase db start` で、すべてのマイグレーションとシードを空のデータベースに適用
   - `pnpm exec supabase test db` で、`supabase/tests/database/` の pgTAP のテストを実行
   - `pnpm db:schema` で型を生成し直し、`packages/database/types/supabase.ts` に差分がないことを確認

**並列実行の利点**：

- Lint、Typecheck、Test、Build が同時に実行されるため、CI時間が短縮されます
- pnpm の組み込みキャッシュ機能により、各ジョブで依存関係を高速にインストールできます
- 各ジョブは個別のチェックとして表示されるため、失敗した場合は具体的にどの段階で問題が発生したか容易に特定できます

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

## データベース開発ワークフロー

### スキーマ変更の手順

1. **ローカル環境でマイグレーション作成**

   ```bash
   pnpm exec supabase migration new add_new_feature
   ```

2. **マイグレーションファイルを編集**
   - `supabase/migrations/` にSQLファイルが作成される
   - DDL、RLSポリシー、関数などを記述

3. **ローカルで適用・テスト**

   ```bash
   pnpm exec supabase db reset  # 全マイグレーションを適用
   pnpm exec supabase test db   # pgTAP のテストを実行
   pnpm db:schema               # 型を生成し直す（生成した型も一緒にコミットする）
   ```

   プルリクエストでは、CI の **Database** ジョブが同じことを確かめます。

4. **本番適用（レビュー後）**
   - main にマージすると、`Supabase DB Push on main` ワークフローが本番に適用します
   - `supabase/` を変えた push だけで動き、同時に2つは動きません
   - 適用の前に、空のデータベースへのマイグレーションの適用と pgTAP のテストを実行し、失敗したら適用しません

### データ操作のベストプラクティス

- **本番データベースは直接操作禁止**
- **ローカル環境で全てのテストを実施**
- **RLSポリシーは必ずローカルでテスト**
- **マイグレーションファイルはGitで管理**
- **個人情報を含むテーブルのエクスポートは禁止**

### データインポート・エクスポート

```bash
# 本番データをローカルにインポート
pnpm db:import

# 特定のファイルからインポート
IMPORT_FILENAME=backup_20241025.sql.gz pnpm db:import

# 本番データをエクスポート（管理者のみ）
export SUPABASE_PROJECT_ID=your-project-id
export SUPABASE_DB_PASSWORD=your-password
pnpm db:export
```

## AI エージェントとの協業

### 各アプリの AGENTS.md（Next.js が管理するブロック）

`apps/*/AGENTS.md` の `<!-- BEGIN:nextjs-agent-rules -->` から `<!-- END:nextjs-agent-rules -->` までのブロックは、コーディングエージェントが `next dev` を起動したときに Next.js が書き込みます。ブロックは手で編集せず、Next.js の更新などで `next dev` が書き換えた場合は、その差分をそのままコミットしてください。

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
│   └── batch/              # バッチ処理
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

### よくある問題と解決方法

#### Supabase サービスが起動しない

```bash
# Supabase CLIのステータスを確認
pnpm exec supabase status

# ログを確認
pnpm exec supabase logs

# サービスを完全にリセット
pnpm exec supabase stop
pnpm exec supabase start
```

#### ポート競合エラー

Supabase のポートが他のサービスと競合する場合：

```bash
# 使用中のポートを確認
lsof -i :54321
lsof -i :54322
lsof -i :54323

# supabase/config.toml でポートを変更する
```

#### データベース接続エラー

```bash
# Supabaseサービスの状態を確認
pnpm exec supabase status

# データベースをリセット
pnpm exec supabase db reset
```

#### MSW が動作しない

```bash
# 環境変数を設定
export ENABLE_MSW=true
```

MSW はサーバー側でだけ動きます。起動すると、開発サーバーのターミナルに `🚀 MSW server started` と表示されます。詳細は [docs/msw-guide.md](docs/msw-guide.md) を参照してください。

### ドキュメント

- [docs/](docs/): プロジェクト固有のドキュメント

## ライセンス

このプロジェクトは [MIT ライセンス](LICENSE) の下で公開されています。

---

ご質問やご不明な点がございましたら、お気軽に Issue を作成してください。皆様の貢献をお待ちしています！
