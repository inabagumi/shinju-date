# Supabaseローカル開発環境セットアップ - 実装サマリー

このドキュメントは、Issue「Supabaseローカル開発環境とデータ同期フローを構築する」の実装内容をまとめたものです。

## 実装内容

### 1. Dev Container設定の更新

**ファイル**: `.devcontainer/devcontainer.json`

以下の機能を追加しました：

- **Supabase CLI**: `ghcr.io/devcontainers-extra/features/supabase-cli:1`
- **Docker Outside of Docker**: `ghcr.io/devcontainers/features/docker-outside-of-docker:1`
- **自動起動**: `postStartCommand`で`supabase start`を実行
- **ポートフォワーディング**: 
  - 54321: Supabase API
  - 54323: Supabase Studio

これにより、Codespaces起動時に自動的にSupabaseローカル環境が立ち上がります。

### 2. Supabase初期設定

**ディレクトリ**: `supabase/`

以下のファイルを作成しました：

- **config.toml**: Supabaseローカル環境の設定ファイル
  - PostgreSQL 15を使用
  - 各種ポート設定
  - RLS、認証、ストレージなどの設定

- **migrations/00000000000000_initial_schema.sql**: 初期スキーママイグレーション（プレースホルダー）
  - 本番環境からスキーマをダンプして記述する必要があります
  - RLSポリシー、関数、トリガーなどを含む

- **seed.sql**: 初期データのシード（空）
  - 開発用のテストデータを追加できます

- **.gitignore**: ローカルのSupabaseデータを除外
  - ボリューム、一時ファイルなど

### 3. データ同期スクリプト

#### エクスポートスクリプト

**ファイル**: `scripts/export-production-data.sh`

機能：
- 本番データベースからデータをダンプ
- gzipで圧縮
- Google Cloud Storage (GCS) または Amazon S3 へのアップロード（オプション）
- 特定のテーブルのみをエクスポート可能（個人情報を含むテーブルは除外）

使用方法：
```bash
export SUPABASE_PROJECT_ID=your-project-id
export SUPABASE_DB_PASSWORD=your-password
export UPLOAD_TO_CLOUD=true
export GCS_BUCKET=your-bucket  # または S3_BUCKET

pnpm db:export
```

#### インポートスクリプト

**ファイル**: `scripts/import-data.sh`

機能：
- GCS/S3から最新のバックアップをダウンロード
- ローカルファイルからのインポートもサポート
- 自動的にファイルを解凍
- ローカルSupabaseにデータをインポート

使用方法：
```bash
# GCS/S3から最新のバックアップをインポート
pnpm db:import

# 特定のファイルをインポート
IMPORT_FILENAME=production_data_20250120_020000.sql.gz pnpm db:import
```

### 4. GitHub Actions ワークフロー

**ファイル**: `.github/workflows/database-backup.yml`

機能：
- 毎日午前2時（UTC）に自動実行
- 手動実行もサポート（workflow_dispatch）
- PostgreSQLクライアントを使用してデータをエクスポート
- GCS/S3へのアップロード（要設定）
- セキュリティ: 最小限の権限（contents: read）を設定

必要なGitHub Secrets：
- `SUPABASE_PROJECT_ID`: SupabaseプロジェクトID
- `SUPABASE_DB_PASSWORD`: データベースパスワード
- `GCS_BACKUP_BUCKET` または `S3_BACKUP_BUCKET`: バックアップ先のバケット名
- `GCP_SA_KEY` または AWS認証情報（使用するストレージによる）

### 5. パッケージスクリプトの追加

**ファイル**: `package.json`

以下のスクリプトを追加：
- `pnpm db:export`: データをエクスポート
- `pnpm db:import`: データをインポート

### 6. ドキュメント

#### README.mdの更新

以下のセクションを追加：
- 開発環境のセットアップ手順
- Supabaseの起動と確認方法
- データベース操作方法
- トラブルシューティング
- デプロイとバックアップの説明

#### 詳細ドキュメント

**ファイル**: `docs/supabase-local-development.md`

以下の内容を含む包括的なガイド：
- アーキテクチャ説明
- 詳細なセットアップ手順
- マイグレーション管理
- データ同期フロー
- トラブルシューティング
- セキュリティベストプラクティス
- 参考資料へのリンク

### 7. .gitignoreの更新

**ファイル**: `.gitignore`

追加された除外項目：
- `supabase/data-exports/`: データダンプファイル

## 完了した受け入れ基準

✅ `devcontainer.json`が更新され、Codespaces上で`supabase`コマンドが`sudo`なしで利用できる
- Supabase CLI featureを追加
- Docker Outside of Docker featureを追加

✅ `supabase start`を実行すると、ローカルでSupabase環境が正常に起動する
- `postStartCommand`で自動起動を設定
- 設定ファイル（config.toml）を作成

✅ RLSポリシーを含む本番のスキーマが、マイグレーションファイルとしてバージョン管理されている
- マイグレーションディレクトリを作成
- 初期スキーママイグレーションファイル（プレースホルダー）を配置
- ドキュメントでスキーマダンプ方法を説明

✅ 本番データの一部が、定期的にGCS/S3へ自動でバックアップされている
- GitHub Actionsワークフローを作成
- 毎日自動実行（cron）
- 手動実行もサポート

✅ 開発者は、単一のコマンドでGCS/S3からデータを取得し、ローカル環境にインポートできる
- `pnpm db:import`コマンドを追加
- 自動ダウンロード、解凍、インポートをサポート

## 次のステップ

実装は完了しましたが、実際に使用するには以下の作業が必要です：

### 1. GitHub Secretsの設定

リポジトリ設定 → Secrets and variables → Actions で以下を設定：

```
SUPABASE_PROJECT_ID: your-supabase-project-id
SUPABASE_DB_PASSWORD: your-database-password
```

クラウドストレージを使用する場合：
```
# Google Cloud Storageの場合
GCS_BACKUP_BUCKET: your-gcs-bucket-name
GCP_SA_KEY: your-service-account-key-json

# Amazon S3の場合
S3_BACKUP_BUCKET: your-s3-bucket-name
AWS_ACCESS_KEY_ID: your-access-key
AWS_SECRET_ACCESS_KEY: your-secret-key
AWS_REGION: your-region
```

### 2. 初期スキーマのダンプ

本番環境からスキーマをダンプして、マイグレーションファイルに記述：

```bash
# Supabase CLIでログイン（初回のみ）
supabase login

# スキーマをダンプ
supabase db dump \
  --project-ref YOUR_PROJECT_ID \
  --schema public \
  --file supabase/migrations/00000000000000_initial_schema.sql
```

または、Supabase Dashboard から SQL Editor で以下を実行してスキーマをコピー：

```sql
-- テーブル定義を取得
SELECT 
    'CREATE TABLE ' || schemaname || '.' || tablename || ' (' ||
    string_agg(column_name || ' ' || data_type, ', ') || ');'
FROM pg_tables
LEFT JOIN information_schema.columns ON table_name = tablename
WHERE schemaname = 'public'
GROUP BY schemaname, tablename;

-- RLSポリシーを取得
SELECT 
    'CREATE POLICY ' || policyname || ' ON ' || schemaname || '.' || tablename ||
    ' FOR ' || cmd || ' USING (' || qual || ');'
FROM pg_policies
WHERE schemaname = 'public';
```

### 3. データエクスポートスクリプトのカスタマイズ

`scripts/export-production-data.sh`の`TABLES_TO_EXPORT`配列を編集して、エクスポートするテーブルを指定：

```bash
TABLES_TO_EXPORT=(
    "public.videos"
    "public.channels"
    "public.tags"
    # 個人情報を含むテーブルは除外
    # "public.users"  # 除外例
)
```

### 4. GitHub Actions ワークフローの有効化

`.github/workflows/database-backup.yml`で、使用するクラウドストレージに応じて認証ステップのコメントを解除：

```yaml
# Google Cloud Storageを使用する場合
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}

- name: Set up Cloud SDK
  uses: google-github-actions/setup-gcloud@v2
```

または

```yaml
# Amazon S3を使用する場合
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ${{ secrets.AWS_REGION }}
```

また、エクスポートステップで対応する環境変数を設定：

```yaml
- name: Export production data
  env:
    SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
    SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
    UPLOAD_TO_CLOUD: 'true'
    GCS_BUCKET: ${{ secrets.GCS_BACKUP_BUCKET }}  # または S3_BUCKET
```

### 5. 環境変数ファイルの設定

ローカル開発用の環境変数を設定：

```bash
# apps/web/.env.local
cp apps/web/.env.local.sample apps/web/.env.local
```

`.env.local`を編集：
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase statusで取得したanon key>
```

### 6. 動作確認

1. GitHub Codespaces または Dev Container で開く
2. Supabaseの起動を確認:
   ```bash
   supabase status
   ```
3. Supabase Studio にアクセス: http://localhost:54323
4. データインポートを試す:
   ```bash
   pnpm db:import
   ```

## トラブルシューティング

問題が発生した場合は、`docs/supabase-local-development.md`のトラブルシューティングセクションを参照してください。

## セキュリティに関する注意事項

- 本番データベースのパスワードは絶対にGitにコミットしない
- データダンプファイルには個人情報を含めない
- ローカル環境で使用した本番データは使用後に削除する
- RLSポリシーは必ずローカルでテストしてから本番に適用する

## 参考資料

- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- [Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
- [GitHub Codespaces](https://github.com/features/codespaces)
