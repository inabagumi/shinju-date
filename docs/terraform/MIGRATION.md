# Terraform マイグレーションガイド

このガイドでは、モジュールを使用して構成を整理し、不足している `shinju-date-insights` プロジェクトを追加するために行われたTerraformリファクタリングについて説明します。

## 変更内容

### 1. モジュールベースの構造
- `terraform/modules/vercel_project/` に再利用可能な `vercel_project` モジュールを作成
- このモジュールは Vercel プロジェクトの共通パターンをカプセル化:
  - プロジェクト設定
  - 共通環境変数（Corepack、バイトコードキャッシング）
  - Redis 環境変数
  - カスタム環境変数
  - デプロイ保持設定

### 2. 追加された新規プロジェクト
- Python FastAPI アプリケーション用に `shinju-date-insights` プロジェクトを追加
- Vercel が自動設定する環境変数を使用（Supabase など）
- API 操作のためにタイムアウトを60秒に設定

### 3. ファイル構成
- `main.tf` - モジュールを使用した全プロジェクト定義（`projects.tf` から名前変更）
- `imports.tf` - 既存リソースのマイグレーション用インポートブロック
- `domain.tf` - モジュール出力を使用するように更新
- `dns.tf` - モジュール出力を使用するように更新
- `modules/vercel_project/` - Vercel プロジェクト用再利用可能モジュール

### 4. 重複の削減
- 以前: 繰り返しパターンで約270行
- 以後: 約120行 + 再利用可能モジュール80行
- メンテナンスと新規プロジェクト追加が容易に

## マイグレーション手順

⚠️ **重要**: これらのコマンドを実行する前に、以下を確認してください:
1. Terraform Cloud アクセスが設定されている
2. Terraform Cloud ワークスペースで必要な変数が全て設定されている

### ステップ1: Terraform の初期化

```bash
cd terraform
terraform init
```

### ステップ2: インポートプランの確認

`imports.tf` ファイルには、既存リソースを新しいモジュール構造に採用するインポートブロックが含まれています。ただし、最初にこのファイルのプロジェクトIDを更新する必要があります。

現在のプロジェクトIDを取得するには:

```bash
# 現在の状態を表示
terraform show
```

または、Vercel ダッシュボードでプロジェクトIDを確認します。

### ステップ3: インポートIDの更新（必須）

`imports.tf` を編集し、プレースホルダーのIDを実際のプロジェクトIDに置き換えます:

```hcl
import {
  to = module.web.vercel_project.this
  id = "prj_実際のWEBプロジェクトID"  # ← これを更新
}
```

以下について ID を更新する必要があります:
- Web プロジェクト
- Admin プロジェクト  
- Batch プロジェクト

### ステップ4: インポートコマンドの生成

既存リソースをモジュールにマイグレーションしているため、インポートブロックをまだサポートしていないリソース（環境変数など）に対して `terraform import` コマンドを使用する必要があります。

プランを実行して、インポートが必要なものを確認:

```bash
terraform plan
```

### ステップ5: 既存リソースのインポート

既存の環境変数やその他のリソースごとに、インポートコマンドを実行する必要がある場合があります。正確なコマンドは現在の状態によって異なります。

形式の例:
```bash
terraform import 'module.web.vercel_project_environment_variable.custom["NEXT_PUBLIC_BASE_URL"]' prj_XXX/env_YYY
```

### ステップ6: 古い構成の削除

すべてのインポートが成功し、`terraform plan` が予期しない変更を示さない場合、古い `project.tf` ファイルを削除できます（`main.tf` に置き換えられました）。

```bash
# 既にファイルは main.tf に名前変更されています
git status
```

### ステップ7: 構成の確認

最終プランを実行して、リソースが破壊または再作成されないことを確認:

```bash
terraform plan
```

期待される出力: "変更なし。インフラストラクチャは構成と一致しています。"

### ステップ8: 適用（必要な場合）

追加のみがある場合（新しい insights プロジェクトなど）、変更を適用:

```bash
terraform apply
```

## 代替案: ゼロから開始（インポートが複雑すぎる場合）

インポートプロセスが複雑すぎる場合:

1. 一時的に古い構成と新しい構成の両方を保持
2. Vercel で insights プロジェクトを手動作成
3. 新しいプロジェクトのみを Terraform にインポート
4. 他のプロジェクトを一つずつ徐々にマイグレーション

## モジュールの利点

### 新規プロジェクトの追加が簡単

新しいプロジェクトを追加するには、数行だけが必要:

```hcl
module "new_app" {
  source = "./modules/vercel_project"
  
  project_name     = "shinju-date-new-app"
  root_directory   = "apps/new-app"
  team_id          = var.vercel_team_id
  
  # 全ての共通設定はモジュールのデフォルトから継承されます
}
```

### 一貫した構成

全てのプロジェクトが以下を共有:
- 同じ git リポジトリ設定
- 同じ認証設定
- 一貫したデプロイ保持
- 標準的な CPU タイプとタイムアウト

### 更新が簡単

全プロジェクトの共通設定を変更するには、各プロジェクトを個別に更新する代わりに、モジュールを一度更新するだけです。

## トラブルシューティング

### 問題: インポートブロックがサポートされていない

Terraform バージョンがインポートブロックをサポートしていない場合、手動インポートコマンドを使用:

```bash
terraform import 'module.web.vercel_project.this' prj_XXX
terraform import 'module.web.vercel_project_deployment_retention.this' prj_XXX
```

### 問題: 状態の競合

状態の競合が発生した場合:

```bash
terraform state rm 'old_resource_address'
terraform import 'new_resource_address' resource_id
```

### 問題: 環境変数がインポートされない

環境変数は手動での再作成またはインポートが必要な場合があります。Vercel API またはダッシュボードでリソースIDを確認してください。

## サポート

マイグレーション中に問題が発生した場合:
- [Terraform Import ドキュメント](https://developer.hashicorp.com/terraform/cli/import)
- [Vercel Terraform プロバイダー ドキュメント](https://registry.terraform.io/providers/vercel/vercel/latest/docs)
