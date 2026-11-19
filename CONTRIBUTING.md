# Contributing to SHINJU DATE

SHINJU DATEプロジェクトへの貢献をご検討いただき、ありがとうございます。このドキュメントでは、プロジェクトに貢献するための手順とガイドラインを説明します。

## 開発環境のセットアップ

**重要**: 開発環境のセットアップ手順は、[docs/setup-guide.md](docs/setup-guide.md) に集約されています。作業を開始する前に、必ずこのガイドを参照してください。

このガイドには、前提条件、依存関係のインストール、Supabaseのローカル設定、開発サーバーの起動方法などが含まれています。

## Dev Container設定の開発とデバッグ

Dev Container設定（`.devcontainer/`）を変更する場合は、`@devcontainers/cli`を使用してローカルでテストしてください。手順は[.devcontainer/README.md](.devcontainer/README.md#dev-container-のテスト)の「Dev Container のテスト」を参照してください。

### 変更すべき設定ファイル

- `.devcontainer/devcontainer.json` - Dev Container本体の設定
- `.devcontainer/compose.override.yml` - Dev Container専用サービス（appのみ）
- `compose.yml`（ルート） - Redis と、Upstash 互換の Redis HTTP API
- `config/dev-secrets.env` - 開発用の環境変数
- `scripts/setup-dev.sh` - プロジェクトの初期化（`.devcontainer/post-create.sh` が呼ぶ。手元で実行するものと同じ）

詳細は[.devcontainer/README.md](.devcontainer/README.md)を参照してください。

## コーディング規約

コードの決まりは、次の2つの文書にまとめています。

- [コーディングガイドライン](docs/coding-guidelines.md)
- [デザインガイドライン](docs/design-guidelines.md)

### コード品質チェック

**重要**: すべてのコード変更後は、必ず以下のコマンドを実行してください。

```bash
pnpm run fix
```

リントは oxlint と Stylelint（CSS）、整形（import の並べ替えと Tailwind のクラスの並べ替えを含む）は oxfmt で行い、どれも [Ultracite](https://www.ultracite.ai/) のプリセットを使います。`pnpm run fix` は自動修正と整形をし、`pnpm run check` は直さずに確かめるだけです（CI と同じ）。

oxlint の設定は、ルートの `oxlint.config.ts` に置いています。`apps/web`、`apps/admin`、`apps/batch`、`packages/ui` の `oxlint.config.ts` は、React と Next.js のプリセットを足し、最後にルートの設定を引き継ぎます（ルートの設定が、プリセットより優先されます）。

- このプロジェクトの決まり（`Date` の禁止、`temporal-polyfill` と `tailwind-merge` の import の禁止など）は、ルートの `oxlint.config.ts` の `rules` と `overrides` に書いています
- 組み込みのルールで確かめられない決まりは、`packages/oxlint-plugin/`（`@shinju-date/oxlint-plugin`）に TypeScript で書いた oxlint の JS プラグインとして置き、ルートの `oxlint.config.ts` の `jsPlugins` で読み込んでいます
- ルールを無効にする行には、`// oxlint-disable-next-line <ルール> -- <理由>` のように、理由を書きます

`packages/oxlint-plugin/` のルールと設定を変えたら、テストを実行してください。`scripts/` のスクリプトを変えたら、そのテストも実行してください。

```bash
pnpm run test --filter=@shinju-date/oxlint-plugin
pnpm run test:scripts
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

#### ドキュメントのリンク

Markdown のファイルを変更した後は、リポジトリの中へのリンクとファイルのパスが実在するかを確かめてください。

```bash
pnpm run check:docs
```

- 相対パスのリンク（`[セットアップガイド](docs/setup-guide.md)`）と、そのリンク先の見出し（`#1-初期セットアップ`）を確かめます
- バッククォートで囲まれた、`apps/`、`packages/`、`docs/`、`scripts/`、`.github/` で始まるファイルのパスを確かめます（`*` を含むパスは、一致するファイルが1つ以上あるかを確かめます）
- 外部の URL は確かめません
- `.agents/` と `.claude/` の下のファイル（`skills` CLI が置いたファイル）は対象外です

#### パッケージのビルドと `exports`

`packages/*` の `tsdown.config.ts` は、`@shinju-date/config/tsdown` の `definePackageConfig()` を呼び、入口（`entry`）と、共通の設定と違う値だけを書きます。共通の設定と違う値には、理由をコメントで書いてください。

`package.json` の `exports` は、各入口を `{ "types": ..., "default": ... }`（`types` が先）の形にし、`main`、`types`、`typesVersions` は書きません（[`@shinju-date/config`](packages/config/README.md#packagejson-の-exports)）。`tsdown.config.ts` や `exports` を変更した後は、ビルドしてから形を確かめてください。

```bash
pnpm run build --filter='./packages/*'
pnpm run check:package-exports
```

- `scripts/check-package-exports.mjs` が、`exports` の形と、指しているファイルが存在するかを確かめます（CI では、`Build (Node.js)` のジョブがビルドのあとに実行します）

### 依存のバージョン

2つ以上の `package.json` に書く依存のバージョンは、`pnpm-workspace.yaml` の `catalog:` に1か所だけ書き、各 `package.json` には `"catalog:"` と書きます。

```json
{
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

- 新しいパッケージやアプリケーションを追加するときは、ほかの `package.json` からバージョンを写さず、`catalog:` にある依存は `"catalog:"` で参照してください
- 1つの `package.json` だけが使う依存は、その `package.json` にバージョンを書きます。2つ目の `package.json` が使うようになったら、`catalog:` に移してください
- `peerDependencies` は、受け入れる範囲を書くため、`catalog:` を使いません。外部のパッケージは `^` の範囲（`^19.0.0` など）、workspace のパッケージは `workspace:*` と書きます
- Renovate は、`catalog:` のバージョンを `pnpm-workspace.yaml` の中で更新します

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

**ほとんどの人が開けない URL を書かない**:

AI エージェントのセッションや、非公開のページの URL は、ログインしていない人や、ほかの環境の人が開くとエラーになります。コミットメッセージとプルリクエストのタイトル・本文には書かないでください。エージェントのハーネスがトレーラー（`Claude-Session:` など）や本文の末尾に自動で付ける URL も消します。`Co-Authored-By:` のトレーラーは残してかまいません。

プルリクエストごとに、ワークフロー（`.github/workflows/check-private-urls.yml`）がタイトル、本文、コミットのメッセージを確かめます。対象の URL は `scripts/check-private-urls.mjs` の `PRIVATE_URL_PATTERNS` にまとめています。push の前に、手元でも確かめられます。

```bash
# origin/main から HEAD までのコミットのメッセージを確かめる
pnpm run check:private-urls
```

見つかったときは、プルリクエストのタイトルや本文を直すと、ワークフローがもう一度実行されます。コミットのメッセージは、`git commit --amend` や `git rebase` で直して push し直します。

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
# 品質チェック（自動修正と整形）
pnpm run fix

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

- CI が通ることを確認
- コードレビューに対応
- 必要に応じて修正

#### プルリクエストで確かめられること

CI は、プルリクエストごとに次のことを確かめます。どれかが失敗すると、マージできません。

- **リント**: oxlint と Stylelint のリントと oxfmt の整形に違反がないこと（oxlint の結果は、プルリクエストの該当の行に出ます）。Markdown の中の、リポジトリの中へのリンクとファイルのパスが実在すること
- **URL**: タイトル、本文、コミットのメッセージに、ほとんどの人が開けない URL がないこと（[コミットメッセージ](#コミットメッセージ)）
- **型チェック**: テストのファイルを含めて、すべてのパッケージとアプリケーションの型に誤りがないこと
- **テスト**: パッケージとアプリケーションのユニットテストが通ること
- **ビルド**: すべてのパッケージがビルドできること。web と admin は、MSW を有効にして本番用にビルドできること
- **E2E**: web、admin、batch の Playwright のテストと、ui の Storybook のブラウザのテストが通ること
- **データベース**: データベースを変えた場合だけ、マイグレーションとシードを空のデータベースに適用できること、pgTAP のテストが通ること、生成される型がコミットされたものと一致すること

### 5. merge queue での取り込み

`main` には、GitHub の merge queue を通して取り込みます。プルリクエストの CI は、作成した時点や push した時点の `main` とのマージ結果で動くため、そのあとに `main` に入った変更との組み合わせは確かめていません。merge queue は、`main` と先に並んでいるプルリクエストを含めた状態でもう一度 CI を動かし、通ったものだけを squash して取り込みます。

- CI が通り、レビューで承認されたら、GitHub の UI の「Merge when ready」か `gh pr merge --auto` で queue に並べる。直接 `main` にはマージできない
- queue の中で CI が失敗したプルリクエストは、取り込まれずに queue から外れる。`main` を取り込んで直し、もう一度並べる
- queue の中の CI（`merge_group` のイベント）でも、データベースと Terraform のジョブは、それらを変えた場合だけ動く

## Issue の起票ルール

### Issue テンプレート

Issue は、次の3つのテンプレートのどれかで作成してください。

- **バグ報告**: 動作の不具合やエラー
- **機能要望**: 新しい機能や改善の提案
- **タスク**: リファクタリングやドキュメントの作成などの作業

## テスト

### テストの実行

```bash
# すべてのテスト
pnpm run test

# 特定のパッケージ
pnpm run test --filter=@shinju-date/helpers

# ウォッチモード
pnpm --filter=@shinju-date/helpers exec vitest
```

テストの書き方は、[テストガイド](docs/testing-guide.md)と [E2E テストガイド](docs/e2e-testing.md)を読んでください。

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
├── supabase/               # マイグレーション、シード、pgTAP のテスト
├── docs/                   # プロジェクトドキュメント
├── terraform/              # インフラ定義
└── CONTRIBUTING.md         # このファイル
```

## サポート

### 質問・相談

- **GitHub Issues**: バグの報告、機能の要望、作業のタスク
- **GitHub Discussions**: 質問、相談、一般的な議論

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

ご質問やご不明な点がございましたら、お気軽に GitHub Discussions で質問してください。皆様の貢献をお待ちしています！
