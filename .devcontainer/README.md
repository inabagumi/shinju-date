# Dev Container Configuration

このディレクトリには、SHINJU DATEプロジェクトのDev Container設定が含まれています。

## 設計原則と職責分離

Dev Container環境は、以下の4つのファイルで構成され、それぞれが明確な役割を持っています：

### 1. Dockerfile - OS レベルのセットアップ

**職責**: コンテナイメージのビルド時に実行される、OSレベルの環境構築を担当します。

**含まれる内容**:
- apt パッケージのインストール（postgresql-client など）
- corepack と pnpm のセットアップ
- uv（Python パッケージマネージャー）のインストール
- システム全体で必要な環境変数の設定

**含まれない内容**:
- プロジェクト固有の依存関係のインストール（pnpm install など）
- データベースマイグレーションの適用
- 型定義ファイルの生成

**メリット**:
- イメージのキャッシュが効くため、再ビルド時間が短縮される
- CI/CD でも同じイメージを再利用できる
- OS レベルの変更が必要な場合のみリビルドされる

### 2. post-create.sh - プロジェクト固有の初期化

**職責**: コンテナ起動後に一度だけ実行される、プロジェクト固有の初期化処理を担当します。

**含まれる内容**:
- プロジェクトの依存関係のインストール（`pnpm install --frozen-lockfile`）
- Supabase データベースのリセットとマイグレーション適用
- TypeScript 型定義の生成（`pnpm typegen`）

**含まれない内容**:
- OS レベルのパッケージインストール（apt-get など）
- システムツールのインストール（corepack、uv など）

**メリット**:
- プロジェクトの変更に応じて柔軟に更新できる
- イメージの再ビルドなしで変更を適用できる
- 開発者ごとに異なる初期化処理を追加しやすい

### 3. devcontainer.json - VS Code / GitHub Codespaces 設定

**職責**: VS Code Dev Container および GitHub Codespaces の動作を定義します。

**含まれる内容**:
- VS Code 拡張機能の指定
- エディタ設定
- ポートフォワーディング設定
- Docker Compose ファイルの参照
- Dev Container Features の有効化
- `postCreateCommand` の指定（post-create.sh へのパス）

**含まれない内容**:
- コンテナイメージの具体的なビルド手順（Dockerfile に記載）
- バックエンドサービスの定義（compose.yml に記載）

### 4. compose.override.yml - Dev Container 専用サービス定義

**職責**: Dev Container で使用する `app` サービスのみを定義します。

**含まれる内容**:
- `app` サービスの Dockerfile ビルド設定
- 環境変数のロード（`env_file` による `../config/dev-secrets.env` の参照）
- ワークスペースのボリュームマウント（`..:/workspaces/shinju-date:cached`）
- Docker ソケットのマウント（`supabase start` のために必要）
- `extra_hosts` によるホスト Docker へのアクセス設定
- 依存サービスの指定（`depends_on` で `serverless-redis-http` など）

**含まれない内容**:
- Supabase サービス（Supabase CLI で管理）
- Redis などの共有サービス（`../compose.yml` で定義）

**補足**:
- ルートの `compose.yml` と組み合わせて使用されます（`dockerComposeFile: ["../compose.yml", "compose.override.yml"]`）
- `../compose.yml` が Redis などの共有開発サービスを定義しています
- ボリュームマウントの `..` は `.devcontainer/compose.override.yml` からの相対パスでプロジェクトルートを指定します

## ファイル構成まとめ

```
.devcontainer/
├── Dockerfile          # OS レベルセットアップ（イメージビルド時）
├── post-create.sh      # プロジェクト固有初期化（コンテナ起動後、supabase start を含む）
├── devcontainer.json   # VS Code / Codespaces 設定
├── compose.override.yml  # Dev Container 専用サービス（app のみ）
└── README.md           # このファイル

../compose.yml           # ルートの compose.yml（Redis のみ）
../config/               # 設定ファイル
  └── dev-secrets.env    # 開発用シークレット（Supabase APIキー、Redisトークン）
../supabase/             # Supabase CLI 設定・マイグレーション
  ├── config.toml        # Supabase CLI ローカル設定
  └── migrations/        # データベースマイグレーション
```

## 運用上の注意点

### Dockerfile のテスト

Dockerfile の変更をローカルでテストするには、`@devcontainers/cli` を使用してください：

```bash
# CLIのインストール（初回のみ）
npm install -g @devcontainers/cli

# Dev Container のビルドとテスト
devcontainer up --workspace-folder .

# テスト後のクリーンアップ
devcontainer down --workspace-folder .
```

詳細は CONTRIBUTING.md の「Dev Container設定の開発とデバッグ」セクションを参照してください。

### Dockerfile を変更した場合

Dockerfile を変更した場合は、**必ず Dev Container をリビルド**してください：

1. VS Code のコマンドパレット（`Cmd+Shift+P` / `Ctrl+Shift+P`）を開く
2. `Dev Containers: Rebuild Container` を実行

または、ローカルで `@devcontainers/cli` を使用してテスト：

```bash
# CLIのインストール（初回のみ）
npm install -g @devcontainers/cli

# Dev Container のビルドとテスト
devcontainer up --workspace-folder .

# テスト後のクリーンアップ
devcontainer down --workspace-folder .
```

### post-create.sh を変更した場合

post-create.sh の変更は、次回のコンテナ作成時に自動的に適用されます。イメージのリビルドは不要です。

ただし、既存のコンテナで変更を適用するには：

```bash
# コンテナ内で手動実行
./.devcontainer/post-create.sh
```

### devcontainer.json を変更した場合

devcontainer.json の変更は、**必ず Dev Container をリビルド**してください：

- VS Code: `Dev Containers: Rebuild Container`
- またはコンテナを完全に削除して再作成

### compose.yml を変更した場合

compose.yml の変更は、**コンテナを再作成**してください：

```bash
# ローカルの場合
docker compose -f compose.yml -f .devcontainer/compose.yml down
docker compose -f compose.yml -f .devcontainer/compose.yml up -d

# VS Code の場合
# Dev Containers: Rebuild Container を実行
```

## 開発ワークフロー

### 初回セットアップ

1. リポジトリをクローン
2. VS Code で開く
3. `Dev Containers: Reopen in Container` を実行
4. Dockerfile からイメージがビルドされる（初回のみ）
5. post-create.sh が自動実行され、依存関係とデータベースが初期化される

### 日常的な開発

- コンテナは一度ビルドすれば、そのまま使い続けられます
- プロジェクトの依存関係を更新した場合は、コンテナ内で `pnpm install` を実行
- Supabase が停止している場合は `pnpm exec supabase start` で再起動
- データベースをリセットしたい場合は `pnpm exec supabase db reset` を実行

## トラブルシューティング

### ビルドが遅い

Dockerfile のキャッシュが効いていない可能性があります。不要な `RUN` 命令を統合するか、変更頻度の低い命令を上部に配置してください。

### post-create.sh がエラーになる

post-create.sh のログを確認し、該当する処理を手動で実行してデバッグしてください：

```bash
# 依存関係のインストール
pnpm install --frozen-lockfile

# Supabase の起動
pnpm exec supabase start

# データベースのリセット
pnpm exec supabase db reset

# 型定義の生成
pnpm typegen
```

### コンテナが起動しない

Docker Compose のログを確認してください：

```bash
docker compose logs app
```

Supabase のログを確認してください：

```bash
pnpm exec supabase logs
```

### uv が利用できない（Python 開発時）

Dockerfile のビルド時にネットワーク接続が利用できない環境では、uv のインストールがスキップされることがあります。この場合、コンテナ内で手動でインストールしてください：

```bash
# コンテナ内で実行
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc  # または新しいシェルを起動
```

VS Code Dev Container や GitHub Codespaces では、通常この問題は発生しません（ビルド時にネットワークアクセスが可能なため）。

## 参考資料

- [Dev Containers 仕様](https://containers.dev/)
- [Docker Compose ドキュメント](https://docs.docker.com/compose/)
- [Supabase公式ドキュメント](https://supabase.com/docs)

---

## 概要

このプロジェクトでは、Docker ComposeをRedisサービスの管理に使用し、SupabaseサービスはSupabase CLI（`supabase start`）で管理します。サービス定義は以下のファイルに分かれています：

- **`../compose.yml`（ルート）**: Redis等の共有開発サービス（Supabaseを除く）
- **`.devcontainer/compose.override.yml`**: Dev Container専用のappサービス

## ファイル構成

- **devcontainer.json** - VSCode Dev Container / GitHub Codespaces の設定
- **compose.override.yml** - Dev Container専用サービス（appのみ）
- **post-create.sh** - コンテナ作成後に実行される初期化スクリプト（`supabase start`を含む）

### ルートレベルの設定ファイル

以下のファイルはプロジェクトルートの`config/`ディレクトリに配置されています：

- **config/dev-secrets.env** - 開発用シークレット（Supabase APIキー、Redisトークン）

## サービス一覧

### アプリケーション開発

- **app** - TypeScript/Node.js 開発コンテナ（メインの作業環境）

### Redis（compose.yml）

- **redis** - Redis 8.4.0（ポート6379）
- **serverless-redis-http** - Upstash互換REST API（ポート8079）

### Supabase（Supabase CLI管理）

Supabaseサービスは `supabase start` コマンドで起動され、Dev Container の `post-create.sh` で自動的に実行されます：

- **API / Kong** (port 54321): APIゲートウェイ
- **PostgreSQL** (port 54322): データベース
- **Supabase Studio** (port 54323): Web管理UI
- **Inbucket** (port 54324): メールテスト用

## 使い方

### サービスの起動（Redisのみ）

```bash
docker compose up -d
```

### Supabaseの起動

```bash
pnpm exec supabase start
```

### サービスの状態確認

```bash
# Redis
docker compose ps

# Supabase
pnpm exec supabase status
```

### サービスのログ確認

```bash
# Redis
docker compose logs -f

# Supabase
pnpm exec supabase logs
```

### サービスの停止

```bash
# Redis
docker compose down

# Supabase
pnpm exec supabase stop
```

## ポートマッピング

| サービス | ポート | 説明 |
|---------|--------|------|
| Supabase API | 54321 | Supabase API エントリーポイント |
| PostgreSQL | 54322 | データベース直接接続 |
| Supabase Studio | 54323 | Web管理UI |
| Inbucket Web UI | 54324 | メール確認UI |
| Redis | 6379 | Redis直接接続 |
| Redis HTTP API | 8079 | Upstash互換REST API |

## データベースマイグレーション

マイグレーションは`../supabase/migrations/`ディレクトリに配置されており、`supabase db reset`で適用されます。

### 新しいマイグレーションの追加

1. `supabase/migrations/`に新しいSQLファイルを作成
   ```bash
   pnpm exec supabase migration new description
   ```

2. マイグレーションSQLを記述

3. ローカルで適用
   ```bash
   pnpm exec supabase db reset
   ```

## トラブルシューティング

### サービスが起動しない

```bash
# Supabaseのログを確認
pnpm exec supabase logs

# Supabaseを再起動
pnpm exec supabase stop
pnpm exec supabase start
```

### ポート競合

`supabase/config.toml`でSupabaseのポートを変更してください：

```toml
[api]
port = 54321  # 変更する

[db]
port = 54322  # 変更する
```

### データベース接続エラー

```bash
# Supabaseの状態を確認
pnpm exec supabase status

# データベースをリセット
pnpm exec supabase db reset
```

## 環境変数

`config/dev-secrets.env`に開発用シークレットが定義されています。Supabase CLI のデフォルトの JWT シークレットに対応したAPIキーが含まれています。

## 注意事項

- **機密情報**: `config/dev-secrets.env`には開発用の固定値のみを使用してください。
- **本番環境**: この設定は開発環境専用です。本番環境では使用しないでください。
- **Docker Socket**: Dev Container の app サービスはホストの Docker ソケットをマウントして `supabase start` を実行します。

## 参考資料

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Supabase CLIリファレンス](https://supabase.com/docs/reference/cli/introduction)
- [Docker Compose ドキュメント](https://docs.docker.com/compose/)
- [Dev Containers 仕様](https://containers.dev/)
