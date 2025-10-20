# SHINJU DATE

[![Node.js CI](https://github.com/inabagumi/shinju-date/workflows/Node.js%20CI/badge.svg)](https://github.com/inabagumi/shinju-date/actions)

「[SHINJU DATE](https://shinju.date/)」は[ななしいんく](https://www.774.ai/)に所属するタレントが[YouTube](https://www.youtube.com/)で配信や投稿した動画を検索できるウェブサービスです。[ななしいんくが定める二次創作ガイドライン](https://www.774.ai/guideline)に従ってななしいんくとは直接の関係がない営利を目的としていない団体である[Haneru Developers](https://haneru.dev/)によって開発と運営が行われています。

## 開発環境のセットアップ

### 前提条件

- [GitHub Codespaces](https://github.com/features/codespaces)または[Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)をサポートするエディタ

### セットアップ手順

1. **リポジトリをCodespacesで開く**
   
   GitHubリポジトリページで「Code」→「Codespaces」→「Create codespace on main」をクリックします。

2. **自動セットアップの完了を待つ**
   
   Dev Containerが起動すると、以下が自動的に実行されます：
   - 依存関係のインストール（`pnpm install`）
   - Supabaseローカル環境の起動（`supabase start`）
   - パッケージのビルド

3. **Supabaseの確認**
   
   Supabaseが正常に起動したか確認します：
   ```bash
   supabase status
   ```
   
   以下のような出力が表示されます：
   ```
   API URL: http://127.0.0.1:54321
   DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
   Studio URL: http://127.0.0.1:54323
   ...
   ```

4. **環境変数の設定**
   
   ローカル開発用の環境変数を設定します：
   
   ```bash
   # apps/web/.env.local
   cp apps/web/.env.local.sample apps/web/.env.local
   ```
   
   `.env.local`ファイルを編集し、Supabaseの接続情報を設定します：
   ```env
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase statusで表示されるanon key>
   ```

5. **開発サーバーの起動**
   
   ```bash
   pnpm dev
   ```
   
   以下のURLでアクセスできます：
   - Web: http://localhost:3000
   - Admin: http://localhost:4000
   - Supabase Studio: http://localhost:54323

### データベースの操作

#### データのインポート

本番環境からエクスポートされたデータをローカル環境にインポートする場合：

```bash
pnpm db:import
```

このコマンドは以下を実行します：
1. 最新のデータダンプファイルをダウンロード（GCS/S3が設定されている場合）
2. ローカルのSupabaseにデータをインポート

#### データベーススキーマの変更

スキーマを変更する場合は、マイグレーションファイルを作成します：

```bash
supabase migration new <migration_name>
```

マイグレーションファイルは`supabase/migrations/`ディレクトリに作成されます。

マイグレーションを適用：

```bash
supabase db reset
```

#### Supabase Studioの使用

ブラウザで http://localhost:54323 にアクセスすると、Supabase Studioが開きます。ここでデータベースの内容を確認したり、テーブルを編集したりできます。

### トラブルシューティング

#### Supabaseが起動しない

```bash
# Supabaseを停止
supabase stop

# Dockerコンテナをクリーンアップ
docker system prune -f

# 再起動
supabase start
```

#### ポートが使用中

他のサービスが同じポートを使用している場合は、`supabase/config.toml`でポート番号を変更できます。

#### データベース接続エラー

Supabaseが完全に起動するまで数秒かかる場合があります。`supabase status`で状態を確認してください。

## 本番環境へのデプロイ

### データベースマイグレーション

ローカルで作成したマイグレーションを本番環境に適用する場合：

```bash
supabase db push --project-ref <your-project-id>
```

⚠️ **注意**: 本番環境への変更は慎重に行ってください。必ずバックアップを取得してから実行してください。

## データバックアップ

本番データベースのバックアップは、GitHub Actionsによって毎日自動的に実行されます（`.github/workflows/database-backup.yml`）。

手動でバックアップを作成する場合：

```bash
# 環境変数を設定
export SUPABASE_PROJECT_ID=<your-project-id>
export SUPABASE_DB_PASSWORD=<your-db-password>

# バックアップを実行
pnpm db:export
```

バックアップファイルは`supabase/data-exports/`に保存されます（このディレクトリはGitから除外されています）。

## ライセンス

[MIT](LICENSE)

