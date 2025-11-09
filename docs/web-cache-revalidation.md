# Web Cache Revalidation Implementation

このドキュメントは、`@shinju-date/web-cache` パッケージの実装とセットアップ方法を説明します。

## 概要

`@shinju-date/web-cache` は、公開サイト (`apps/web`) のキャッシュを安全に再検証するための共有パッケージです。このパッケージにより、`apps/admin` と `apps/batch` からの再検証ロジックを一元管理し、Bearerトークン認証によるセキュリティを強化しています。

## 実装内容

### 1. 新規パッケージの作成

**場所**: `packages/web-cache/`

**主な機能**:
- `revalidateTags(tags: string[], options?: RevalidateOptions)`: 指定されたタグのキャッシュを再検証する関数
- 環境変数からの設定読み込み
- Bearerトークン認証のサポート
- エラーハンドリングとロギング

### 2. セキュリティ強化

**場所**: `apps/web/app/api/revalidate/route.ts`

**変更内容**:
- `Authorization` ヘッダーのBearerトークン検証を追加
- 認証失敗時に401エラーを返す
- 認証試行のログ記録

### 3. 既存コードの統合

#### apps/batch
- `apps/batch/lib/revalidate.ts` を削除
- 以下のルートで `@shinju-date/web-cache` を使用:
  - `app/videos/update/route.ts`
  - `app/videos/check/route.ts`
  - `app/channels/update/route.ts`

#### apps/admin
以下のサーバーアクションに `revalidateTags` を追加:

**Videos**:
- `app/(dashboard)/videos/_actions/index.ts`:
  - `toggleVisibilityAction`
  - `toggleSingleVideoVisibilityAction`
  - `softDeleteAction`
  - `softDeleteSingleVideoAction`
- `app/(dashboard)/videos/_actions/sync.ts`:
  - `syncVideoWithYouTube`

**Talents**:
- `app/(dashboard)/talents/_actions/index.ts`:
  - `createTalentAction`
  - `updateTalentAction`
  - `deleteTalentAction`
- `app/(dashboard)/talents/_actions/sync.ts`:
  - `syncTalentWithYouTube`

**Terms**:
- `app/(dashboard)/terms/_actions/index.ts`:
  - `createTermAction`
  - `updateTermAction`
  - `deleteTermAction`

**Recommended Queries**:
- `app/(dashboard)/recommended-queries/_actions/index.ts`:
  - `addQueryAction`
  - `deleteQueryAction`

### 4. 環境変数の追加

`turbo.json` の `globalEnv` に以下を追加:
- `REVALIDATE_URL`
- `REVALIDATE_SECRET_TOKEN`

## セットアップ手順

### 1. シークレットトークンの生成

以下のコマンドで安全なランダムトークンを生成します:

```bash
openssl rand -hex 32
```

### 2. Vercelでの環境変数設定

以下の環境変数を、`apps/web`、`apps/admin`、`apps/batch` のすべてで設定してください:

| 環境変数名 | 値の例 | 説明 |
|---|---|---|
| `REVALIDATE_URL` | `https://shinju.date/api/revalidate` | 再検証APIのエンドポイントURL |
| `REVALIDATE_SECRET_TOKEN` | `<生成したトークン>` | 認証用のBearerトークン |

**重要**: `REVALIDATE_SECRET_TOKEN` は3つのアプリケーションすべてで同じ値を使用してください。

### 3. ローカル開発環境

ローカル開発環境では、各アプリの `.env.local` ファイルに以下を追加:

```bash
# apps/web/.env.local
REVALIDATE_SECRET_TOKEN=your-local-test-token

# apps/admin/.env.local
REVALIDATE_URL=http://localhost:3000/api/revalidate
REVALIDATE_SECRET_TOKEN=your-local-test-token

# apps/batch/.env.local
REVALIDATE_URL=http://localhost:3000/api/revalidate
REVALIDATE_SECRET_TOKEN=your-local-test-token
```

## 使用方法

### 基本的な使用例

```typescript
import { revalidateTags } from '@shinju-date/web-cache'

// 動画関連のキャッシュを再検証
await revalidateTags(['videos'])

// 複数のタグを再検証
await revalidateTags(['talents', 'videos'])

// AbortSignalを使用
await revalidateTags(['videos'], { signal: request.signal })
```

### キャッシュタグの選択

- `videos`: 動画の一覧や詳細が変更された場合
- `channels`: タレント/チャンネル情報が変更された場合
- 複数指定: 変更が複数のエンティティに影響する場合

## エラーハンドリング

`revalidateTags` 関数は、エラーが発生してもアプリケーションの主要な処理を中断しません:

1. エラーはログに記録されます（`@shinju-date/logger` 使用）
2. 関数は例外をスローせず、正常に完了します
3. これにより、キャッシュ再検証の失敗がデータ更新操作を妨げません

## セキュリティ上の注意

1. **トークンの管理**:
   - `REVALIDATE_SECRET_TOKEN` は十分に長く、ランダムな文字列を使用してください
   - トークンはGitにコミットしないでください
   - 定期的にトークンをローテーションすることを推奨します

2. **アクセス制御**:
   - `/api/revalidate` エンドポイントは認証されたリクエストのみを受け付けます
   - 認証失敗の試行はログに記録されます

## トラブルシューティング

### 401 Unauthorized エラー

**原因**: `REVALIDATE_SECRET_TOKEN` が一致していない

**解決策**:
1. すべてのアプリケーションで同じトークンが設定されているか確認
2. Vercelの環境変数設定を確認
3. デプロイ後に環境変数を変更した場合は、再デプロイが必要

### キャッシュが更新されない

**原因**: 環境変数 `REVALIDATE_URL` が設定されていない、または不正

**解決策**:
1. `REVALIDATE_URL` が正しいURLに設定されているか確認
2. 本番環境では `https://shinju.date/api/revalidate` を使用
3. ローカル開発では適切なローカルURLを使用

### ログの確認

エラーの詳細は Sentry のログで確認できます:
- `apps/web`: 認証エラーのログ
- `apps/admin` / `apps/batch`: 再検証リクエストのエラーログ

## 関連ファイル

- `packages/web-cache/src/index.ts`: メインの実装
- `apps/web/app/api/revalidate/route.ts`: 再検証APIエンドポイント
- `turbo.json`: 環境変数の定義
