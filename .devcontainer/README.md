# Dev Container Configuration

このディレクトリには、SHINJU DATEプロジェクトのDocker Compose ベースの開発環境設定が含まれています。

## 概要

このプロジェクトでは、`supabase start`コマンドの代わりにDocker Composeを使用してSupabaseサービスを直接管理します。これにより、サービス起動の安定性と再現性が向上します。

## ファイル構成

- **compose.yml** - すべての開発サービスの定義（Supabase、Redis、アプリケーション）
- **devcontainer.json** - VSCode Dev Container / GitHub Codespaces の設定
- **post-create.sh** - コンテナ作成後に実行される初期化スクリプト
- **kong.yml** - Kong API Gateway の設定ファイル
- **vector.yml** - Vector ログ集約サービスの設定
- **init-db.sh** - データベース初期化スクリプト（マイグレーション適用）
- **.env.example** - 環境変数のサンプルファイル

## サービス一覧

### アプリケーション開発

- **app** - TypeScript/Node.js 開発コンテナ（メインの作業環境）

### Redis

- **redis** - Redis 8.4.0（ポート6379）
- **serverless-redis-http** - Upstash互換REST API（ポート8079）

### Supabase サービス

- **db** - PostgreSQL 17（ポート54322）
- **kong** - API Gateway（ポート54321）
- **auth** - GoTrue 認証サービス
- **rest** - PostgREST APIサービス
- **storage** - ストレージAPIサービス
- **realtime** - リアルタイム機能
- **mailpit** - メールテスト用SMTP/UI（ポート54324、1025）
- **studio** - Supabase Studio（ポート54323）
- **pg-meta** - データベースメタデータサービス
- **edge-runtime** - Edge Functions ランタイム
- **analytics** - ログとアナリティクス（ポート54327）
- **vector** - ログ集約

## 使い方

### サービスの起動

```bash
cd .devcontainer
docker compose up -d
```

### サービスの状態確認

```bash
docker compose ps
```

### サービスのログ確認

```bash
# すべてのサービス
docker compose logs -f

# 特定のサービス
docker compose logs -f db
docker compose logs -f kong
```

### サービスの停止

```bash
# サービスを停止（データは保持）
docker compose down

# サービスとデータをすべて削除
docker compose down -v
```

## ポートマッピング

| サービス | ポート | 説明 |
|---------|--------|------|
| Kong API Gateway | 54321 | Supabase API エントリーポイント |
| PostgreSQL | 54322 | データベース直接接続 |
| Supabase Studio | 54323 | Web管理UI |
| Mailpit Web UI | 54324 | メール確認UI |
| SMTP | 1025 | メール送信テスト |
| Analytics | 54327 | アナリティクスサービス |
| Redis | 6379 | Redis直接接続 |
| Redis HTTP API | 8079 | Upstash互換REST API |

## データベースマイグレーション

マイグレーションは`../supabase/migrations/`ディレクトリに配置されており、データベースコンテナの初期化時に自動的に適用されます。

### 新しいマイグレーションの追加

1. `supabase/migrations/`に新しいSQLファイルを作成
   ```bash
   touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql
   ```

2. マイグレーションSQLを記述

3. データベースを再作成してマイグレーションを適用
   ```bash
   cd .devcontainer
   docker compose down -v  # データをすべて削除
   docker compose up -d    # 再起動してマイグレーションを適用
   ```

## トラブルシューティング

### サービスが起動しない

```bash
# ログを確認
docker compose logs <service-name>

# サービスを再起動
docker compose restart <service-name>

# すべてをリセット
docker compose down -v
docker compose up -d
```

### ポート競合

`.devcontainer/compose.yml`のポートマッピングを変更してください：

```yaml
ports:
  - "5433:5432"  # ホストポートを変更
```

### データベース接続エラー

```bash
# データベースの準備完了を確認
docker compose exec db pg_isready -U supabase_admin

# データベースに直接接続
docker compose exec db psql -U supabase_admin -d postgres
```

## 環境変数

`.env.example`ファイルを参考に、必要に応じて`.env`ファイルを作成してください。ただし、`.env`ファイルは機密情報を含む可能性があるため、Gitにコミットしないでください。

## 注意事項

- **機密情報**: `.env`ファイルには機密情報を含めないでください。開発用の固定値のみを使用してください。
- **本番環境**: この設定は開発環境専用です。本番環境では使用しないでください。
- **データ永続化**: データベースとストレージのデータは名前付きボリューム（`db-data`、`storage-data`）に保存されます。
- **自動起動**: Dev Container使用時は、コンテナ作成時にサービスが自動的に起動します。

## 参考資料

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Docker Compose ドキュメント](https://docs.docker.com/compose/)
- [Dev Containers 仕様](https://containers.dev/)
