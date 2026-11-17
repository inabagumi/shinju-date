# Dev Container

このディレクトリには、SHINJU DATE の Dev Container（VS Code Dev Containers / GitHub Codespaces）の設定があります。

## 概要

- **app**: 作業用のコンテナです。Node.js、pnpm、Terraform、PostgreSQL のクライアントが入っています
- **Redis**: ルートの `compose.yml` が、app と並べて起動します
- **Supabase**: app の中の Docker-in-Docker で、Supabase CLI（`pnpm exec supabase start`）が起動します

バージョンは、リポジトリのほかの設定に合わせています。

| ツール    | Dev Container の設定                                    | 合わせる先                                                                  |
| --------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| Node.js   | `Dockerfile` の基底のイメージ（`typescript-node:5-26`） | `.node-version` と `package.json` の `devEngines`（同じメジャーバージョン） |
| pnpm      | `Dockerfile` の `PNPM_VERSION`                          | `package.json` の `devEngines.packageManager`                               |
| Terraform | `devcontainer.json` の Terraform の機能の `version`     | `terraform/versions.tf` の `required_version`                               |

Node.js のメジャーバージョンは、Renovate が `.node-version` と一緒に上げます（`.github/renovate.json` の「Node.js major」のグループ）。

## ファイル構成

```
.devcontainer/
├── Dockerfile            # OS レベルの準備（イメージのビルド時）
├── post-create.sh        # プロジェクトの初期化（コンテナの作成後。scripts/setup-dev.sh を呼ぶ）
├── devcontainer.json     # VS Code / Codespaces の設定
├── devcontainer-lock.json  # Dev Container の機能のロックファイル
├── compose.override.yml  # Dev Container 専用のサービス（app のみ）
└── README.md             # このファイル

../compose.yml            # 共有のサービス（Redis）
../config/dev-secrets.env # 開発用のシークレット（Supabase の API キー、Redis のトークン）
../scripts/setup-dev.sh   # 開発環境の初期設定（手元、Copilot のワークフローと共通）
../supabase/              # Supabase CLI の設定とマイグレーション
```

### Dockerfile

コンテナのイメージのビルド時に実行する、OS レベルの準備を書きます。

- apt のパッケージ（`postgresql-client` など）のインストール
- pnpm のインストール（公式のインストールスクリプトを使う）

プロジェクトの依存関係のインストールや、データベースの初期化は書きません（`scripts/setup-dev.sh` に書く）。イメージのキャッシュが効くため、再ビルドの時間が短くなります。

### post-create.sh

コンテナの作成後に一度だけ実行されます。`scripts/setup-dev.sh` を呼ぶだけで、ほかの処理は書きません。このスクリプトは、手元と、Copilot のワークフロー（`.github/workflows/copilot-setup-steps.yml`）が実行するものと同じです（[セットアップガイド](../docs/setup-guide.md#13-開発環境の初期設定)）。

- 依存関係のインストール（`pnpm install`）
- Supabase の起動（`pnpm exec supabase start`。初回は、マイグレーションとシードも適用する）
- Redis の起動（Dev Container では、外側の Docker Compose が起動済みなので、何もしない）
- 3つのアプリの `.env.local` の作成（すでにあれば、上書きしない）
- TypeScript の型定義の生成（`pnpm typegen`）

Supabase や Redis の起動、型定義の生成に失敗しても、警告を出して先に進むので、コンテナは立ち上がります。コンテナの中で原因を直してから、もう一度 `./scripts/setup-dev.sh` を実行してください。

Dev Container だけに要る初期化が出てきた場合も、まず `scripts/setup-dev.sh` に書けないかを考えてください（3つの環境の手順が、食い違わないようにするためです）。

### devcontainer.json

VS Code の拡張機能、転送するポート、Compose のファイル、Dev Container の機能（Docker-in-Docker、Terraform）、`postCreateCommand` を指定します。

### compose.override.yml

Dev Container で使う `app` サービスだけを定義します。

- `privileged: true`（Docker-in-Docker で、コンテナの中の dockerd を動かすために必要）
- `env_file` で `./config/dev-secrets.env` を読み込む
- ワークスペースのマウント（`.:/workspaces/shinju-date:cached`）
- Supabase の URL（Docker-in-Docker が公開する `http://127.0.0.1:54321`）と、Redis の URL（`http://serverless-redis-http:80`）
- `depends_on` で `serverless-redis-http` を待つ

ルートの `compose.yml` と組み合わせて使います（`dockerComposeFile: ["../compose.yml", "compose.override.yml"]`）。相対パスは、最初の Compose のファイル（プロジェクトのルートの `compose.yml`）から解決するため、`.` はプロジェクトのルートを指します。

## ポート

`devcontainer.json` の `forwardPorts` で、次のポートをホストに転送します。

| ポート | サービス        | 説明                     |
| ------ | --------------- | ------------------------ |
| 3000   | Web             | `apps/web`               |
| 4000   | Admin           | `apps/admin`             |
| 5000   | Batch           | `apps/batch`             |
| 8079   | Redis HTTP API  | Upstash 互換の REST API  |
| 54321  | Supabase API    | Supabase の API の入り口 |
| 54323  | Supabase Studio | Web の管理画面           |
| 54324  | Mailpit Web UI  | メールの確認画面         |

次のポートは転送しませんが、コンテナの中から使えます。

| 接続先            | サービス   | 説明                                  |
| ----------------- | ---------- | ------------------------------------- |
| `redis:6379`      | Redis      | Redis への直接の接続（`compose.yml`） |
| `127.0.0.1:54322` | PostgreSQL | データベースへの直接の接続            |

Supabase のポートを変える場合は、`supabase/config.toml` を編集してください。

## Docker-in-Docker と Redis

- **Supabase**: app コンテナの中の Docker-in-Docker（`docker-in-docker` の機能）の上で、`supabase start` が起動します。ポートは、app コンテナの `127.0.0.1` に公開されます。bind mount のパスも、コンテナのファイルシステムの中で完結します
- **Redis**: 外側の Docker Compose（`compose.yml`）が、app と並べて起動します。app からは、サービス名 `serverless-redis-http` で接続します
- Dev Container の中で `docker ps` を実行すると、**Docker-in-Docker の上のコンテナ（主に Supabase）だけ**が見えます。外側の Redis のコンテナは、ホストの Docker に属するため、表示されません。Redis が動いているかは、`curl http://serverless-redis-http/` などで確かめてください
- `scripts/setup-dev.sh` は、環境変数 `UPSTASH_REDIS_REST_URL`（`compose.override.yml` が設定する）の Redis が応答すれば、Docker-in-Docker の上に、もう1つの Redis を起動しません

## 使い方

### 初回

1. リポジトリをクローンする
2. VS Code で開き、`Dev Containers: Reopen in Container` を実行する
3. `Dockerfile` からイメージがビルドされ、`post-create.sh`（`scripts/setup-dev.sh`）が依存関係、データベース、`.env.local` を用意する

### 日常の開発

- 依存関係を更新した場合は、コンテナの中で `pnpm install` を実行する
- 開発サーバーは `pnpm dev` で起動する
- Supabase が止まっている場合は、`pnpm exec supabase start` で起動する
- Supabase の状態は `pnpm exec supabase status`、ログは `pnpm exec supabase logs` で確かめる
- データベースをリセットする場合は、`pnpm exec supabase db reset` を実行する

### マイグレーションの追加

マイグレーションは `supabase/migrations/` にあり、`supabase db reset` で適用されます。

```bash
pnpm exec supabase migration new description
```

SQL を書いたら、`pnpm exec supabase db reset` でローカルに適用します。

## 設定を変更した場合

| 変更したファイル                         | 反映のしかた                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `Dockerfile`、`devcontainer.json`        | `Dev Containers: Rebuild Container` で、コンテナを作り直す                             |
| `compose.yml`、`compose.override.yml`    | コンテナを作り直す（`devcontainer down` の後に `devcontainer up`）                     |
| `post-create.sh`、`scripts/setup-dev.sh` | 次のコンテナの作成時に反映される。今のコンテナでは `./scripts/setup-dev.sh` を実行する |

## Dev Container のテスト

`.devcontainer/` の設定を変更した場合は、**必ず** `@devcontainers/cli` でローカルでテストしてください。CI では、`.github/workflows/devcontainer-test.yml` が同じ手順で、Node.js のバージョン、`terraform validate`、`pnpm dev` を確かめます。

```bash
# CLI のインストール（初回のみ）
npm install -g @devcontainers/cli

# Dev Container のビルドと起動
devcontainer up --workspace-folder .

# Dev Container の中でコマンドを実行する
devcontainer exec --workspace-folder . node --version
devcontainer exec --workspace-folder . terraform -chdir=terraform validate

# テスト後の後片付け
devcontainer down --workspace-folder .
```

## トラブルシューティング

### post-create.sh が失敗する

ログを確かめ、原因を直してから、もう一度実行してください。何度実行しても、同じ結果になります。

```bash
./scripts/setup-dev.sh
```

### コンテナが起動しない

Docker Compose のログを確かめてください。

```bash
docker compose logs app
```

### Supabase に接続できない

```bash
pnpm exec supabase status
pnpm exec supabase stop
pnpm exec supabase start
```

### ビルドが遅い

`Dockerfile` のキャッシュが効いていない可能性があります。`RUN` をまとめるか、変更の少ない命令を上に置いてください。

## 注意

- `config/dev-secrets.env` には、開発用の固定の値だけを書いてください
- この設定は開発環境専用です。本番環境では使わないでください
- app サービスは `privileged: true` で、コンテナの中に独立した Docker のデーモンを起動します

## 参考資料

- [Dev Containers の仕様](https://containers.dev/)
- [Docker Compose のドキュメント](https://docs.docker.com/compose/)
- [Supabase のドキュメント](https://supabase.com/docs)
- [Supabase CLI のリファレンス](https://supabase.com/docs/reference/cli/introduction)
