# Terraform クイックスタートガイド

このガイドは、新しいTerraform構成を素早く理解して使用するための手引きです。

## ユーザー向け: 知っておくべきこと

### 何が変わったか？

1. ✅ **`shinju-date-insights` プロジェクトを追加** - Python FastAPI アプリがデプロイ可能に
2. ✅ **`shinju-date-ui` プロジェクトを追加** - Storybook がデプロイ可能に
3. ✅ **モジュールでコードを整理** - 重複を削減し、保守が容易に
4. ✅ **非推奨警告を修正** - 最新のVercelプロバイダー機能を使用
5. ✅ **包括的なドキュメント** - README、マイグレーションガイド、サンプル

### 必要な作業

#### 1. インポートIDの更新（初回のみ）

`terraform/imports.tf` を編集し、プレースホルダーのIDを実際のプロジェクトIDに置き換えます。

プロジェクトIDを確認するには:
```bash
cd terraform
terraform init
terraform state list | grep vercel_project
```

または Vercel ダッシュボードで確認: `https://vercel.com/<team>/settings/projects`

`imports.tf` の以下の行を更新:
```hcl
# prj_XXX_WEB を実際のIDに置き換え
import {
  to = module.web.vercel_project.this
  id = "prj_実際のID"
}
```

web、admin、batch プロジェクトについて同様に行います。

#### 2. Terraform Plan の実行

```bash
cd terraform
terraform init
terraform plan
```

**期待される出力**: 
- 既存リソースはインポート（変更なし）
- 新しい `shinju-date-insights` プロジェクトのみ作成
- リソースの削除や再作成はなし

#### 3. 変更の適用

プランが問題なければ:
```bash
terraform apply
```

これで新しい insights プロジェクトが作成されます。

## 開発者向け: 新規プロジェクトの追加

新しいVercelプロジェクトの追加が非常に簡単になりました！

### ステップ1: モジュールブロックを追加

`terraform/main.tf` を編集:

```hcl
module "my_app" {
  source = "./modules/vercel_project"

  project_name         = "shinju-date-my-app"
  root_directory       = "apps/my-app"
  team_id              = var.vercel_team_id
  
  # オプション: デフォルト値を上書き
  framework                = "nextjs"  # または null
  function_default_timeout = 30
  
  # オプション: カスタム環境変数
  environment_variables = {
    MY_CUSTOM_VAR = {
      value  = "my-value"
      target = ["production", "preview"]
    }
  }
}
```

### ステップ2: ドメインを追加（オプション）

カスタムドメインが必要な場合、`terraform/domain.tf` を編集:

```hcl
resource "vercel_project_domain" "my_app" {
  domain     = "my-app.shinju.date"
  project_id = module.my_app.project_id
  team_id    = module.my_app.team_id
}
```

### ステップ3: 適用

```bash
cd terraform
terraform plan
terraform apply
```

これで完了！新しいプロジェクトがデプロイされました。🚀

## よくあるモジュールオプション

### すべてのオプション

```hcl
module "example" {
  source = "./modules/vercel_project"

  # 必須
  project_name   = "project-name"
  root_directory = "apps/example"
  team_id        = var.vercel_team_id

  # オプション - フレームワーク
  framework = "nextjs"  # または Next.js 以外のアプリの場合は null

  # オプション - パフォーマンス
  function_default_cpu_type = "standard"        # または "standard_legacy"
  function_default_timeout  = 30                # 秒
  function_default_regions  = ["hnd1"]          # 東京

  # オプション - 共通機能
  enable_corepack           = true   # Node.js プロジェクトで有効化
  enable_bytecode_caching   = true   # Next.js プロジェクトで有効化
  enable_redis              = true   # Upstash Redis を使用する場合有効化

  # オプション - Redis 設定
  upstash_redis_rest_token     = var.upstash_redis_rest_token
  upstash_redis_rest_token_dev = var.upstash_redis_rest_token_dev
  upstash_redis_rest_url       = var.upstash_redis_rest_url
  upstash_redis_rest_url_dev   = var.upstash_redis_rest_url_dev

  # オプション - カスタム環境変数
  environment_variables = {
    VAR_NAME = {
      value  = "var-value"
      target = ["production", "preview", "development"]
    }
  }

  # オプション - デプロイ保持設定
  deployment_retention = {
    expiration_canceled   = "1m"
    expiration_errored    = "1m"
    expiration_preview    = "1m"
    expiration_production = "unlimited"
  }
}
```

### よくあるパターン

#### Next.js アプリケーション（デフォルト）
```hcl
module "nextjs_app" {
  source = "./modules/vercel_project"
  
  project_name   = "my-nextjs-app"
  root_directory = "apps/nextjs"
  team_id        = var.vercel_team_id
  
  # すべてのデフォルト値が Next.js 向けに最適化されています
  # Corepack、バイトコードキャッシング、Redis がデフォルトで有効
}
```

#### Python/FastAPI アプリケーション
```hcl
module "python_app" {
  source = "./modules/vercel_project"
  
  project_name   = "my-python-app"
  root_directory = "apps/python"
  team_id        = var.vercel_team_id
  framework      = null  # Next.js ではない
  
  # Node.js 固有の機能を無効化
  enable_corepack         = false
  enable_bytecode_caching = false
  enable_redis            = false  # Python アプリが Redis を使用しない場合
}
```

#### 長時間実行される関数（バッチジョブ）
```hcl
module "batch_app" {
  source = "./modules/vercel_project"
  
  project_name   = "my-batch-app"
  root_directory = "apps/batch"
  team_id        = var.vercel_team_id
  
  # 長時間実行ジョブのためにタイムアウトを増やす
  function_default_timeout = 120  # 2分
}
```

## トラブルシューティング

### 問題: インポートに失敗する

**エラー**: `Error: resource already managed by Terraform`

**解決方法**: リソースは既にインポート済みです。`imports.tf` からインポートブロックを削除してください。

### 問題: 環境変数が既に存在する

**エラー**: `environment variable already exists`

**解決方法**: これはマイグレーション中に予想される動作です。値が一致していれば、モジュールが既存の変数を更新します。

### 問題: Vercel API レート制限

**エラー**: `429 Too Many Requests`

**解決方法**: 数分待ってから再試行してください。一度に作成するリソース数を減らすことを検討してください。

### 問題: プロジェクトIDが見つからない

**エラー**: `resource not found`

**解決方法**: `imports.tf` のプロジェクトIDが正しいか確認してください。`terraform state list` でプロジェクトを一覧表示します。

## ヘルプが必要ですか？

1. 📖 詳細なドキュメントは [README.md](README.md) を参照
2. 🔄 マイグレーションヘルプは [MIGRATION.md](MIGRATION.md) を確認
3. 📊 変更概要は [SUMMARY.md](SUMMARY.md) を参照
4. 🔍 前後の例は [COMPARISON.md](COMPARISON.md) を参照

## 追加リソース

- [Terraform ドキュメント](https://developer.hashicorp.com/terraform/docs)
- [Vercel Terraform プロバイダー](https://registry.terraform.io/providers/vercel/vercel/latest/docs)
- [Terraform Cloud](https://app.terraform.io/)

---

**クイックリンク**:
- 📦 [モジュール変数](modules/vercel_project/variables.tf)
- 🔧 [モジュールリソース](modules/vercel_project/main.tf)
- 📤 [モジュール出力](modules/vercel_project/outputs.tf)
