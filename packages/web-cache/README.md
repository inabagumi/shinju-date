# @shinju-date/web-cache

公開サイト (`apps/web`) のキャッシュを再検証するための共通ユーティリティパッケージです。

## インストール

```bash
pnpm add @shinju-date/web-cache
```

## 使用方法

```typescript
import { revalidateTags } from '@shinju-date/web-cache'

// キャッシュタグを再検証
await revalidateTags(['videos', 'talents'])

// AbortSignalを使用
await revalidateTags(['videos'], { signal: request.signal })
```

## 環境変数

以下の環境変数を設定してください：

- `REVALIDATE_URL`: 再検証APIのエンドポイントURL（例: `https://shinju.date/api/revalidate`）
- `REVALIDATE_SECRET_TOKEN`: 認証用のBearerトークン（省略可能だが、本番環境では必須）

## セキュリティ

`REVALIDATE_SECRET_TOKEN` は、`openssl rand -hex 32` などで生成した、十分に長いランダムな文字列を使用してください。
このトークンは、`apps/web`, `apps/admin`, `apps/batch` で共有します。
