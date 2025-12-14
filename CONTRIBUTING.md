# Contributing to SHINJU DATE

SHINJU DATEプロジェクトへの貢献をご検討いただき、ありがとうございます。このドキュメントでは、プロジェクトに貢献するための手順とガイドラインを説明します。

## 開発環境のセットアップ

**重要**: 開発環境のセットアップ手順は、[docs/setup-guide.md](docs/setup-guide.md) に集約されています。作業を開始する前に、必ずこのガイドを参照してください。

このガイドには、前提条件、依存関係のインストール、Supabaseのローカル設定、開発サーバーの起動方法などが含まれています。

## Dev Container設定の開発とデバッグ

Dev Container設定（`.devcontainer/`）を変更する場合は、`@devcontainers/cli`を使用してローカルでテストしてください。

### Dev Containers CLIのインストール

```bash
npm install -g @devcontainers/cli
```

### Dev Container設定のテスト

```bash
# Dev Containerをビルドしてテスト
devcontainer up --workspace-folder .

# Dev Container内でコマンドを実行
devcontainer exec --workspace-folder . pnpm install

# Dev Containerを停止
devcontainer down --workspace-folder .
```

### 変更すべき設定ファイル

- `.devcontainer/devcontainer.json` - Dev Container本体の設定
- `.devcontainer/compose.yml` - Dev Container専用サービス（appのみ）
- `compose.yml`（ルート） - Supabase、Redis等の共有サービス
- `config/` - Kong、Vector等の設定ファイル

詳細は[.devcontainer/README.md](.devcontainer/README.md)を参照してください。

## コーディング規約

### JavaScript/TypeScript

- **フォーマッター**: Biome を使用
- **リンティング**: Biome の規則に従う
- **型安全性**: TypeScript の厳格な型チェックを使用
- **型定義**: オブジェクト型には `interface` を優先使用（詳細は [docs/coding-guidelines.md](docs/coding-guidelines.md#typescript-型定義) を参照）

### Python（Insights API）

- **フォーマッター**: Ruff を使用
- **リンティング**: Ruff の規則に従う
- **型ヒント**: すべての関数にtype hintsを記載

### コード品質チェック

**重要**: すべてのコード変更後は、必ず以下のコマンドを実行してください。

#### JavaScript/TypeScript

```bash
pnpm run check --fix
```

#### Python（Insights API）

```bash
cd apps/insights
uv run poe format
uv run poe lint
```

### TypeScript 型定義の規約

**重要**: オブジェクト型の定義には `interface` を使用してください。

```typescript
// ✅ 推奨
interface ComponentProps {
  title: string
  onClose: () => void
}

// ❌ 非推奨（例外を除く）
type ComponentProps = {
  title: string
  onClose: () => void
}
```

**例外**: 以下の場合は `type` を使用します：
- ユニオン型: `type Status = 'active' | 'inactive'`
- インターセクション型: `type Combined = A & B`
- マップド型・条件型・タプル型

詳細は [docs/coding-guidelines.md](docs/coding-guidelines.md#typescript-型定義) を参照してください。

### Next.js Cache Directives（キャッシュディレクティブ）

**🚨 厳格なルール - 必ず守ること**: 

1. **`'use cache'` ディレクティブの直後には必ず空行を1行入れる**
2. **`cacheLife()` や `cacheTag()` などの後にも必ず空行を1行入れる**
3. **全てのファイルで例外なくこのルールを適用する**

```typescript
// ✅ 正しい例
async function MyComponent() {
  'use cache: remote'
  
  cacheLife('hours')
  cacheTag('my-tag')
  
  const data = await fetchData()
  return <div>{data}</div>
}

// ❌ 間違った例
async function MyComponent() {
  'use cache: remote'
  const data = await fetchData() // NG: ディレクティブの後に空行がない
  return <div>{data}</div>
}
```

**キャッシュのベストプラクティス**:
- キャッシュはデータ取得関数のレベルで行い、コンポーネントとメタデータ生成関数の両方で再利用する
- 重複してキャッシュディレクティブを使用しない
- `'use cache: remote'` は公開データに使用し、`'use cache: private'` は認証が必要なデータに使用する
- データ取得関数にキャッシュディレクティブがある場合、その関数を呼び出すコンポーネントでは追加のキャッシュディレクティブは不要

### Redisキーの管理

**重要**: すべてのRedisキーは`@shinju-date/constants`の`REDIS_KEYS`オブジェクトで一元管理してください。

#### ルール

1. **キーの定義場所**
   - すべてのRedisキープレフィックスは`packages/constants/src/index.ts`の`REDIS_KEYS`に定義
   - ハードコーディングは禁止

2. **日付フォーマット**
   - 日付を含むキーには`@shinju-date/temporal-fns`の`formatDateKey`を使用（`YYYYMMDD`形式）
   - 例: `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${formatDateKey(now)}` → `summary:stats:20251111`

3. **TTL設定**
   - すべてのキーに適切な有効期限（TTL）を設定すること
   - 例: `{ ex: 30 * 24 * 60 * 60 }` // 30日間

#### 例

```typescript
import { REDIS_KEYS } from '@shinju-date/constants'
import { formatDateKey } from '@shinju-date/temporal-fns'

// ✅ 正しい例
const key = `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${formatDateKey(now)}`
await redis.set(key, data, { ex: 30 * 24 * 60 * 60 })

// ❌ 間違った例（ハードコーディング）
const key = 'summary:stats:2025-11-11'
await redis.set(key, data)
```

詳細は [AGENTS.md](AGENTS.md) の「Redisキーの管理」セクションを参照してください。

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
- `web`, `admin`, `batch`, `insights`: 各アプリケーション
- `database`, `msw-handlers`, `logger` など: 各パッケージ

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
# 品質チェック
pnpm run check --fix

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

- CI/CDが通ることを確認
  - **Lint**: コード品質チェック（Biome）が成功すること
  - **Test**: テストが全て成功すること
  - **Build**: 全てのパッケージとアプリケーションがビルドできること
- コードレビューに対応
- 必要に応じて修正

#### CI/CD の構成

Node.js CI は以下のジョブ構成になっています：

1. **Install Dependencies** - 依存関係の検証
   - `pnpm install --frozen-lockfile` を実行し、pnpm のキャッシュを有効化
   - 他の全てのジョブの前提条件として機能

2. **Lint** - コード品質チェック（並列実行）
   - Install Dependencies 成功後に実行
   - pnpm のキャッシュを使用して高速にインストール
   - Biomeによるフォーマットとリンティングを実行

3. **Test** - テスト実行（並列実行）
   - Install Dependencies 成功後に実行
   - pnpm のキャッシュを使用して高速にインストール
   - ユニットテストを実行

4. **Build** - ビルド確認（並列実行）
   - Install Dependencies 成功後に実行
   - pnpm のキャッシュを使用して高速にインストール
   - 全てのパッケージとアプリケーションがビルドできることを確認

5. **E2E Tests** - エンドツーエンドテスト
   - Test と Build の両方が成功した場合に実行
   - 現在は準備中（将来的に追加予定）

**並列実行の利点**：
- Lint、Test、Build が同時に実行されるため、CI時間が短縮されます
- pnpm の組み込みキャッシュ機能により、各ジョブで依存関係を高速にインストールできます
- 各ジョブは個別のチェックとして表示されるため、失敗した場合は具体的にどの段階で問題が発生したか容易に特定できます

## Issue の起票ルール

### Issue のタイプ

- **Bug Report**: バグの報告
- **Feature Request**: 新機能の提案
- **Documentation**: ドキュメントの改善
- **Question**: 質問・相談

### Issue テンプレート

Issueを作成する際は、提供されているテンプレートを使用してください：

- **再現手順**: バグの場合は詳細な再現手順
- **期待する動作**: どのような動作を期待するか
- **実際の動作**: 実際に何が起こるか
- **環境情報**: OS、ブラウザ、Node.jsバージョンなど

## テスト

### テストの実行

```bash
# すべてのテスト
pnpm run test

# 特定のパッケージ
pnpm run test --filter=@shinju-date/database

# ウォッチモード
pnpm run test --watch
```

### テストの作成

- **ユニットテスト**: 各関数・コンポーネントのテスト
- **統合テスト**: API エンドポイントや機能の統合テスト
- **E2Eテスト**: 主要なユーザーフローのテスト

## データベース開発ワークフロー

### スキーマ変更の手順

1. **ローカル環境でマイグレーション作成**
   ```bash
   supabase migration new add_new_feature
   ```

2. **マイグレーションファイルを編集**
   - `supabase/migrations/` にSQLファイルが作成される
   - DDL、RLSポリシー、関数などを記述

3. **ローカルで適用・テスト**
   ```bash
   supabase db reset  # 全マイグレーションを適用
   ```

   **注意**: Dev Container や GitHub Actions 環境では、`supabase db reset` が失敗した場合、自動的に `psql` ベースのマイグレーションインポートにフォールバックします。手動でマイグレーションとシードデータを適用する場合は以下のコマンドを使用できます：

   ```bash
   # psqlを使用してマイグレーションとシードデータを手動適用
   ./scripts/apply-migrations.sh
   ```

   このスクリプトは `supabase/migrations/` 配下の全SQLファイルを適用した後、`supabase/seed.sql` が存在する場合はそれも適用します。

4. **本番適用（レビュー後）**
   ```bash
   supabase db push --project-ref YOUR_PROJECT_ID
   ```

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

このプロジェクトでは GitHub Copilot などの AI ツールを積極的に活用しています。詳細は [AGENTS.md](AGENTS.md) を参照してください。

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
│   ├── batch/              # バッチ処理
│   └── insights/           # データ分析API
├── packages/               # 共有パッケージ
│   ├── database/           # データベース関連
│   ├── msw-handlers/       # MSW モックハンドラ
│   └── ...
├── docs/                   # プロジェクトドキュメント
├── terraform/              # インフラ定義
└── CONTRIBUTING.md         # このファイル
```

## サポート

### 質問・相談

- **GitHub Issues**: 技術的な質問や提案
- **GitHub Discussions**: 一般的な議論

### よくある問題と解決方法

#### Supabase サービスが起動しない

```bash
# Docker Compose の状態を確認
cd .devcontainer
docker compose ps

# サービスのログを確認
docker compose logs db
docker compose logs kong

# サービスを完全にリセット
docker compose down -v
docker compose up -d
```

#### ポート競合エラー

Supabase のポートが他のサービスと競合する場合：

```bash
# 使用中のポートを確認
lsof -i :54321
lsof -i :54322
lsof -i :54323

# 競合するサービスを停止するか、.devcontainer/compose.yml でポートを変更
```

#### データベース接続エラー

```bash
# データベースサービスの状態を確認
docker compose -f .devcontainer/compose.yml ps db

# データベースに直接接続してテスト
docker compose -f .devcontainer/compose.yml exec db psql -U supabase_admin -d postgres
```

#### MSW が動作しない

```bash
# MSW サービスワーカーを初期化
cd apps/web && pnpm run msw:init
cd apps/admin && pnpm run msw:init

# 環境変数を設定
export ENABLE_MSW=true
```

#### Python 依存関係の問題

```bash
# uv の更新
pip install --upgrade uv

# 依存関係の再インストール
cd apps/insights
uv sync --extra dev --reinstall
```

### ドキュメント

- [docs/](docs/): プロジェクト固有のドキュメント
- [AGENTS.md](AGENTS.md): AI エージェント活用ガイド

## ライセンス

このプロジェクトは [MIT ライセンス](LICENSE) の下で公開されています。

---

ご質問やご不明な点がございましたら、お気軽に Issue を作成してください。皆様の貢献をお待ちしています！