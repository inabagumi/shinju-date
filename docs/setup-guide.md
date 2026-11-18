# SHINJU DATE セットアップガイド

このガイドは、SHINJU DATE開発環境をセットアップするための、信頼できる唯一の情報源（Single Source of Truth）です。人間の開発者とAIエージェントの両方を対象としています。

## 前提条件

作業を開始する前に、以下のツールがインストールされていることを確認してください。

- **Node.js**: `.node-version` ファイルで指定されたバージョン。`nvm` などのバージョン管理ツールの使用を推奨します。
- **pnpm**: 公式のインストールスクリプトなどでインストールします。使用するバージョンは `package.json` の `devEngines.packageManager` で固定されており、pnpm v11 以降であれば自動的に切り替わります。
- **Docker**: ローカルのSupabase環境とRedisを実行するために必要です。
- **Docker Compose**: Redisサービスのオーケストレーションに使用します。

**注意**: SupabaseサービスはDocker Composeではなく、`supabase` npm パッケージを通じた Supabase CLI で管理されます（`pnpm exec supabase start`）。個別にSupabase CLIをインストールする必要はありません。

### Dev Container / GitHub Codespaces を使う場合

VS Code Dev Containers または GitHub Codespaces では、`.devcontainer/` の設定により環境が自動構築されます。

- **Docker-in-Docker**: app コンテナ内に独立した Docker daemon が動き、`pnpm exec supabase start` はその上で Supabase を起動します。
- **Redis**: 外側の Docker Compose（`compose.yml`）が app と一緒に起動します。接続先は `http://serverless-redis-http:80`（コンテナ内）です。
- **Supabase URL**: コンテナ内では `http://127.0.0.1:54321` を使います。
- 初回は `post-create.sh` が、手元と同じ `scripts/setup-dev.sh`（[1.3. 開発環境の初期設定](#13-開発環境の初期設定)）を実行します。

詳細は [`.devcontainer/README.md`](../.devcontainer/README.md) を参照してください。

## 1. 初期セットアップ

### 1.1. リポジトリのクローン

```bash
git clone https://github.com/inabagumi/shinju-date.git
cd shinju-date
```

### 1.2. Node.js と pnpm の設定

このプロジェクトは特定のバージョンの Node.js と pnpm を使用します。pnpm がインストールされていない場合は、公式のインストールスクリプトでインストールしてください（その他の方法は [pnpm のインストールガイド](https://pnpm.io/installation) を参照してください）。

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

インストールスクリプトはシェルの設定ファイル（`~/.bashrc` や `~/.zshrc` など）に `PATH` の設定を追加しますが、現在のシェルには反映されません。インストール後は、スクリプトが案内する設定ファイルを読み込むか、ターミナルを開き直してから次の手順に進んでください。

pnpm（v11 以降）は `package.json` の `devEngines.packageManager` に指定されたバージョンを自動的にダウンロードして使用します。また、`devEngines.runtime` に指定された Node.js も `pnpm install` の際に自動的にダウンロードされます。

### 1.3. 開発環境の初期設定

Docker を起動してから、リポジトリのルートで次のコマンドを実行します。

```bash
./scripts/setup-dev.sh
```

このスクリプトは、次のことを順に行います。初回は Docker イメージを取得するため、数分かかる場合があります。

| 順 | 行うこと | 実行するコマンド | 説明 |
| --- | --- | --- | --- |
| 1 | 依存関係のインストール | `pnpm install` | monorepo のすべての依存関係を入れます |
| 2 | Supabase の起動（初回は、マイグレーションとシードも適用） | `pnpm exec supabase start` | [3. ローカルSupabase環境](#3-ローカルsupabase環境) |
| 3 | Redis の起動 | `docker compose up -d --wait` | [4. ローカルRedis環境](#4-ローカルredis環境) |
| 4 | 3つのアプリの `.env.local` の作成 | （スクリプトの中で作ります） | [5.1. `.env.local` ファイル](#51-envlocal-ファイル) |
| 5 | 内部パッケージの型定義（`.d.ts`）の生成 | `pnpm typegen` | TypeScript の型チェックと、エディタの自動補完に必要です |

何度実行しても、同じ結果になります。Supabase と Redis が起動済みなら何もせず、すでにある `.env.local` は上書きしません。`.env.local` をサンプルから作り直すときは、`--force` を付けます。

```bash
./scripts/setup-dev.sh --force
```

Supabase や Redis の起動、型定義の生成に失敗しても、スクリプトは警告を出して先に進み、最後に失敗したことをまとめて表示します（開発に Supabase や Redis が要らない場合もあり、Dev Container では、立ち上げたコンテナの中で原因を直すためです）。原因を直してから、もう一度実行してください。Supabase が起動していない間は、`.env.local` を作りません。

Dev Container（`.devcontainer/post-create.sh`）と、GitHub Copilot のエージェントの環境（`.github/workflows/copilot-setup-steps.yml`）も、同じスクリプトを実行します。

## 2. 開発サーバーの起動

これで開発サーバーを起動する準備が整いました。

```bash
# すべてのアプリを同時に起動
pnpm run dev

# または、特定のアプリのみを起動
pnpm run dev --filter=@shinju-date/web
```

`pnpm run dev` は `turbo watch dev` で、`dev` の前に依存するパッケージをビルドし（`dependsOn: ["^build"]`）、パッケージのソースが変わると、そのパッケージを再ビルドします。

これで開発環境のセットアップは完了です。以降の章は、`./scripts/setup-dev.sh` が用意した環境の説明です。

## 3. ローカルSupabase環境

本番データベースへの影響を避けるため、開発にはローカルのSupabaseスタックを使用します。SupabaseサービスはSupabase CLI（`pnpm exec supabase`）で管理されます。

### 3.1. Supabaseサービスの起動

`./scripts/setup-dev.sh` が、Supabase CLIでローカルのSupabaseサービスを起動します。停止したあとに、Supabase だけを起動する場合は、次のコマンドを実行します。

```bash
pnpm exec supabase start
```

初回起動時は必要なDockerイメージをプルするため、数分かかる場合があります。

このコマンドは以下のサービスを起動します：

- **PostgreSQL** (port 54322): データベース
- **API / Kong** (port 54321): APIゲートウェイ
- **GoTrue** (internal): 認証サービス
- **PostgREST** (internal): REST APIサービス
- **Storage API** (internal): ファイルストレージ
- **Realtime** (internal): リアルタイム機能
- **Mailpit** (port 54324): メールテスト用Webインターフェース
- **Studio** (port 54323): Supabase管理UI

### 3.2. データベースの初期化

マイグレーションとシードデータは、初回の起動時に適用されます。データベースを空にして、適用し直す場合は、次のコマンドを実行します（ローカルのデータは消えます）：

```bash
pnpm exec supabase db reset
```

### 3.3. サービスの状態確認

サービスが正常に起動しているか確認します：

```bash
pnpm exec supabase status
```

### 3.4. Supabase Studioへのアクセス

ブラウザで [http://localhost:54323](http://localhost:54323) を開くと、Supabase Studioにアクセスできます。ここからデータベースのテーブル、認証ユーザー、ストレージバケットなどを管理できます。

### 3.5. 管理画面にログインするユーザーの作成

管理画面（`apps/admin`）とデータベースの RLS は、Supabase Auth にログインできるだけのユーザーを管理者として扱いません。`app_metadata.role` が `admin` のユーザーのみが削除済みデータの閲覧や更新を行えます（データベース側では `public.is_admin()` で判定します）。

ローカル環境では、Supabase Studio の「Authentication」からユーザーを作成したあと、SQL Editor などで管理者ロールを付与してください：

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
WHERE email = 'you@example.com';
```

`app_metadata` はユーザー自身では変更できず、サービスロールキー（`supabase.auth.admin.updateUserById`）か SQL でのみ変更できます。管理者ロールの付与・削除は即座に反映されます。

MSW を使用する場合、モックのユーザー（`admin@example.com`）には管理者ロールが付与済みです。

### 3.6. サムネイルの表示の確認

サムネイルの画像は、Storage の `thumbnails` バケット（非公開）に保存し、`/images/thumbnails/[id]` のルートが署名付きの URL を作って配信します。バケットはマイグレーションで作られますが、シードのデータはサムネイルを含みません（SQL のシードでは画像のファイルを置けず、ファイルのない行は配信のルートでエラーになるため）。シードの動画は、どれもサムネイルなしで表示されます。

ローカルでサムネイルの表示を確かめるときは、画像のファイルをアップロードしてから、`thumbnails` テーブルに行を足し、動画に結び付けます。

1. サービスロールキーを環境変数に読み込みます：

   ```bash
   eval "$(pnpm exec supabase status -o env 2>/dev/null | grep -E '^(API_URL|SERVICE_ROLE_KEY|DB_URL)=')"
   ```

2. 画像のファイル（ここでは `thumbnail.jpg`）を、`thumbnails` バケットの `local/thumbnail.jpg` にアップロードします：

   ```bash
   curl -X POST "$API_URL/storage/v1/object/thumbnails/local/thumbnail.jpg" \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
     -H 'Content-Type: image/jpeg' \
     --data-binary @thumbnail.jpg
   ```

   Supabase Studio の「Storage」から、`thumbnails` バケットにアップロードしてもかまいません。

3. `thumbnails` テーブルに行を足し、シードの動画に結び付けます（`path` は、アップロードしたパスと同じにします。`width` と `height` は画像の大きさに合わせます）：

   ```bash
   psql "$DB_URL" <<'SQL'
   WITH "thumbnail" AS (
     INSERT INTO "public"."thumbnails" ("path", "width", "height", "blur_data_url")
     VALUES ('local/thumbnail.jpg', 1280, 720, 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==')
     RETURNING "id"
   )
   UPDATE "public"."videos"
   SET "thumbnail_id" = (SELECT "id" FROM "thumbnail")
   WHERE "id" = '30000000-0000-0000-0000-000000000011';
   SQL
   ```

ファイルのないパスを指す行を足すと、管理画面の `/images/thumbnails/[id]` はステータスコード 500 を返します。行を足す前に、ファイルをアップロードしてください。

### 3.7. 本番データのインポート（任意ですが推奨）

より現実的なデータで開発を進めるため、本番データベースからサニタイズされたスナップショットをインポートできます。

```bash
pnpm db:import
```

**注意**: 本番データベースからのデータエクスポートは、プロジェクト管理者のみが実行できます。個人情報を含むテーブルのエクスポートは禁止されています。

### 3.8. サービスの停止

開発作業を終了する際は、サービスを停止できます：

```bash
pnpm exec supabase stop
```

データを保持したまま停止する場合は上記コマンドを使用します。データベースやストレージのボリュームを完全に削除する場合は：

```bash
pnpm exec supabase stop --no-backup
```

## 4. ローカルRedis環境

Upstash Redisの機能を完全にテストするため、ローカルのRedisをDocker Composeで動かします。

### 4.1. Redisサービスの起動

`./scripts/setup-dev.sh` が、Docker ComposeでRedisサービスを起動します（Supabaseとは独立して起動します）。Redis だけを起動する場合は、次のコマンドを実行します。

```bash
docker compose up -d --wait
```

このコマンドは以下のサービスを起動します：

- **Redis 8** (port 6379): ネイティブRedisプロトコル
- **Redis HTTP API** (port 8079): Upstash互換REST API

停止する場合は、`docker compose down` を実行します。

### 4.2. 接続テスト

Redis HTTP APIが正常に動作しているか確認：

```bash
curl -X POST http://localhost:8079 \
  -H "Authorization: Bearer HQe-H5xQJO6ADYplIW-LYFZWRMGwpSjRfHneRw52aPI" \
  -H "Content-Type: application/json" \
  -d '["PING"]'

# 成功した場合、{"result":"PONG"} が返されます
```

トークンは、Redis HTTP APIが受け付ける `config/dev-secrets.env` の `SRH_TOKEN` の値です（開発専用の固定の値です）。

### 4.3. 動作しない場合

Docker Composeが動作しない場合は、MSW（Mock Service Worker）を使用してください。MSWは全ての環境で動作する完全なRedisモックを提供し、`.env.local`ファイルのサンプルにはMSW設定も含まれています。

詳細は [MSWガイド](msw-guide.md) を参照してください。

## 5. 環境変数

このプロジェクトでは、様々なサービスのための環境変数が必要です。ローカル開発では、各アプリの `.env.local` ファイルで設定します。

### 5.1. `.env.local` ファイル

`./scripts/setup-dev.sh` は、3つのアプリ（`apps/web`、`apps/admin`、`apps/batch`）のそれぞれで、`.env.local.sample` を元に `.env.local` を作り、次の変数に、ローカルの Supabase と Redis の値を入れます。

| 変数 | 入れる値 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `pnpm exec supabase status -o env` の `API_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `pnpm exec supabase status -o env` の `ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `pnpm exec supabase status -o env` の `SERVICE_ROLE_KEY` |
| `UPSTASH_REDIS_REST_TOKEN` | `config/dev-secrets.env` の `SRH_TOKEN` |

- サンプルにない変数は足しません（`apps/batch` のサンプルには、`NEXT_PUBLIC_SUPABASE_ANON_KEY` がありません）。
- `apps/admin` と `apps/batch` では、`ENABLE_MSW=true` も有効にします。この2つのアプリは、YouTube と Twitch の API キー（`GOOGLE_API_KEY`、`TWITCH_CLIENT_ID`、`TWITCH_CLIENT_SECRET`）がないと、`ENABLE_MSW=true` でない限り起動しないためです。MSW が Supabase と Redis を模擬するのは、偽の URL（`https://fake.supabase.test`、`https://fake.upstash.test`）に送った通信だけなので、ローカルの Supabase と Redis にはそのままつながり、YouTube と Twitch の API だけがモックになります。本物の API キーを使うときは、キーを設定し、`ENABLE_MSW=true` の行を消してください。
- ほかの変数は、サンプルの値のままです（Redis の URL は `http://localhost:8079`）。サンプルで空の変数は、使うときに `.env.local` を編集して設定してください。
- すでに `.env.local` があるアプリでは、何もしません。サンプルから作り直すときは、`./scripts/setup-dev.sh --force` を実行します（編集した内容は消えます）。
- サンプルの Redis のトークンが `config/dev-secrets.env` の `SRH_TOKEN` と一致しているかは、CIの `pnpm run check:dev-secrets` が確かめます。
- MSWモックを使用したい場合は、サンプルのコメントを参照して設定を変更してください。
- Dev Container では、`.devcontainer/compose.override.yml` が設定するコンテナの環境変数（Redis の URL など）が、`.env.local` の値より優先されます。

システムの TLS 証明書を Turbopack に使わせる必要がある環境では、シェルで次の環境変数も設定します。

```bash
export NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1
```

### 5.2. AIエージェントおよびCI環境（MSW使用時）

AIエージェントやCI環境でMSWを使用する場合は、`ENABLE_MSW=true` と、Supabase や Upstash のための fake の値を設定します。設定する値は、`packages/config/playwright.ts` と各アプリの `playwright.config.ts` の `env` にあります（E2E テストでは、Playwright がこの値で開発サーバーを起動します。[E2E テストの環境設定](e2e-testing.md#2-環境設定)）。

MSW（Mock Service Worker）はサーバー側でだけ動くため、サービスワーカーのファイル（`mockServiceWorker.js`）を用意する必要はありません。詳細は [MSWガイド](msw-guide.md) を参照してください。

## トラブルシューティング

### Supabaseサービスが起動しない

Supabase CLIのログを確認：

```bash
pnpm exec supabase logs
```

Supabaseを再起動する場合：

```bash
pnpm exec supabase stop
pnpm exec supabase start
```

### ポートの競合

Supabaseが使用するポート（54321、54322、54323、54324）が既に使用中の場合、`supabase/config.toml`でポートを変更できます。

### データベース接続エラー

1. Supabaseが正常に起動しているか確認：

   ```bash
   pnpm exec supabase status
   ```

2. データベースに直接接続してテスト：

   ```bash
   eval "$(pnpm exec supabase status -o env 2>/dev/null | grep '^DB_URL=')"
   psql "$DB_URL"
   ```

3. データベースをリセットして再初期化：

   ```bash
   pnpm exec supabase db reset
   ```

### 型定義の生成に失敗

Supabaseが起動していることを確認してから再生成：

```bash
pnpm exec supabase start
pnpm db:schema
```
