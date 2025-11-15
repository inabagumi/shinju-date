# SHINJU DATE の Terraform 構成

このディレクトリには、SHINJU DATEプロジェクトのインフラストラクチャ管理用のTerraform構成、特にVercelデプロイメントの管理が含まれています。

## 構造

```
terraform/
├── main.tf              # プロバイダーとバックエンド設定、プロジェクト定義
├── versions.tf          # Terraform とプロバイダーのバージョン制約
├── variables.tf         # 入力変数
├── domain.tf            # ドメインとリダイレクト設定
├── dns.tf               # shinju.date の DNS レコード
├── imports.tf           # リソースマイグレーション用インポートブロック（要設定）
├── MIGRATION.md         # 詳細なマイグレーションガイド
├── modules/
│   └── vercel_project/  # Vercel プロジェクト用再利用可能モジュール
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── .gitignore
```

## 管理リソース

### プロジェクト

1. **shinju-date** (web)
   - https://shinju.date の公開ウェブサイト
   - `apps/web` からの Next.js アプリケーション
   - Redis キャッシング有効

2. **shinju-date-admin**
   - https://admin.shinju.date の管理ダッシュボード
   - `apps/admin` からの Next.js アプリケーション
   - Redis キャッシング有効

3. **shinju-date-batch**
   - バッチ処理（Nitro）
   - `apps/batch` からの Cron ジョブ関数
   - YouTube Data API 統合
   - Redis キャッシング有効

4. **shinju-date-insights** ✨ 新規
   - `apps/insights` からの Python FastAPI アプリケーション
   - 用語抽出と分析 API
   - Vercelが自動設定する環境変数を使用

5. **shinju-date-ui** ✨ 新規
   - `packages/ui` からの Storybook デプロイメント
   - 共有 UI コンポーネントのドキュメント
   - UI パーツの参照用

### その他のリソース

- ドメイン設定とリダイレクト
- shinju.date の DNS レコード
- デプロイ保持ポリシー
- 全プロジェクトの環境変数

## モジュール: vercel_project

Vercel プロジェクトの共通パターンをカプセル化した再利用可能モジュール。

### 機能

- 標準化されたプロジェクト設定
- 自動環境変数管理:
  - Corepack サポート
  - バイトコードキャッシング
  - Upstash Redis
  - カスタム変数
- デプロイ保持設定
- 柔軟な設定

### 使用例

```hcl
module "my_app" {
  source = "./modules/vercel_project"

  project_name     = "shinju-date-my-app"
  root_directory   = "apps/my-app"
  team_id          = var.vercel_team_id
  
  # オプションの上書き
  framework                  = "nextjs"
  function_default_timeout   = 30
  upstash_redis_rest_token   = var.upstash_redis_rest_token
  upstash_redis_rest_token_dev = var.upstash_redis_rest_token_dev
  upstash_redis_rest_url     = var.upstash_redis_rest_url
  upstash_redis_rest_url_dev = var.upstash_redis_rest_url_dev
  
  environment_variables = {
    MY_CUSTOM_VAR = {
      value  = "my-value"
      target = ["production", "preview"]
    }
  }
}
```

## 必要な変数

これらの変数は Terraform Cloud ワークスペースで設定する必要があります:

- `vercel_api_token` - Vercel API トークン
- `vercel_team_id` - Vercel チーム ID
- `google_api_key` - YouTube Data API 用 Google API キー
- `upstash_redis_rest_token` - Redis REST トークン（本番環境）
- `upstash_redis_rest_token_dev` - Redis REST トークン（プレビュー/開発環境）
- `upstash_redis_rest_url` - Redis REST URL（本番環境）
- `upstash_redis_rest_url_dev` - Redis REST URL（プレビュー/開発環境）

**注意**: Supabase 環境変数（`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`）は Vercel が自動的に設定するため、Terraform での設定は不要です。

## はじめに

### 前提条件

- Terraform >= 1.13
- ワークスペースが設定された Terraform Cloud アカウント
- チームアクセス権を持つ Vercel アカウント
- Terraform Cloud で設定された全ての必要な変数

### 初回セットアップ（新規ワークスペース）

新規の場合:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 既存構成からのマイグレーション

既存のインフラストラクチャが古い構成で管理されている場合:

1. [MIGRATION.md](MIGRATION.md) を十分に読む
2. 実際のプロジェクトIDで `imports.tf` を更新
3. マイグレーション手順を慎重に実行

## 一般的な操作

### 新規プロジェクトの追加

1. `main.tf` に新しいモジュールブロックを追加:

```hcl
module "new_app" {
  source = "./modules/vercel_project"
  
  project_name   = "shinju-date-new-app"
  root_directory = "apps/new-app"
  team_id        = var.vercel_team_id
  
  # 必要に応じて設定
}
```

2. ドメインが必要な場合、`domain.tf` に追加:

```hcl
resource "vercel_project_domain" "new_app" {
  domain     = "new-app.shinju.date"
  project_id = module.new_app.project_id
  team_id    = module.new_app.team_id
}
```

3. 変更を適用:

```bash
terraform plan
terraform apply
```

### 環境変数の更新

モジュールブロック内の `environment_variables` マップを編集:

```hcl
module "web" {
  # ...
  environment_variables = {
    NEXT_PUBLIC_BASE_URL = {
      value  = "https://shinju.date"
      target = ["production"]
    }
    NEW_VARIABLE = {
      value  = "new-value"
      target = ["production", "preview"]
    }
  }
}
```

### タイムアウトまたは CPU タイプの変更

モジュールパラメータを更新:

```hcl
module "batch" {
  # ...
  function_default_timeout  = 180  # 3分に増加
  function_default_cpu_type = "performance"
}
```

## トラブルシューティング

### 既存プロジェクトへの変更

`terraform plan` 実行時に予期しない変更が表示される場合:

1. `imports.tf` に正しいプロジェクトIDがあるか確認
2. 環境変数名とターゲットが一致しているか確認
3. マイグレーションガイドを見直す

### インポートエラー

インポートブロックが失敗する場合:

1. Terraform バージョンがインポートブロックをサポートしているか確認（>= 1.5）
2. プロジェクトIDが正しいか確認
3. フォールバックとして手動インポートコマンドを使用

### 環境変数の競合

環境変数が再作成が必要と表示される場合があります。通常、以下の場合は安全です:
- キーと値が同一
- リソースアドレスのみが変更されている

## メンテナンス

### モジュールの更新

モジュールの動作を更新するには:

1. `modules/vercel_project/` のファイルを編集
2. 変更をテスト: `terraform plan`
3. 変更を適用: `terraform apply`

モジュールへの変更は、それを使用する全てのプロジェクトに自動的に影響します。

### バージョンアップデート

Terraform またはプロバイダーのバージョンを更新するには:

1. `versions.tf` を編集
2. `terraform init -upgrade` を実行
3. `terraform plan` でテスト

## ベストプラクティス

1. **常に apply 前に plan を実行**: 変更を慎重に確認
2. **一貫性のためにモジュールを使用**: プロジェクト設定を重複させない
3. **カスタム変数をドキュメント化**: 明確性のために説明を追加
4. **機密データは Terraform Cloud に保持**: シークレットをコミットしない
5. **すべてをバージョン管理**: 機密変数と状態を除く

## リンク

- [Vercel Terraform プロバイダー](https://registry.terraform.io/providers/vercel/vercel/latest/docs)
- [Terraform Cloud](https://app.terraform.io/)
- [プロジェクトリポジトリ](https://github.com/inabagumi/shinju-date)

## サポート

質問や問題がある場合:
- マイグレーションヘルプは [MIGRATION.md](MIGRATION.md) を確認
- Terraform ドキュメントを参照
- チームメンテナに連絡
