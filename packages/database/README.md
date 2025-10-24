# @shinju-date/database

データベース接続と型定義を提供するパッケージ。

## 構成

- **Supabase**: データベースクライアント
- **TypeScript**: 型安全なデータベース操作
- **Next.js**: フレームワーク統合

## 使用方法

```typescript
import { supabase } from '@shinju-date/database'

// データベース操作の例
const { data, error } = await supabase
  .from('videos')
  .select('*')
  .limit(10)
```

## 型生成

Supabase の型定義を生成するには：

```bash
# 環境変数 SUPABASE_PROJECT_ID を設定してから実行
pnpm run generate
```

## 開発

```bash
# ビルド
pnpm run build

# 開発モード（ウォッチ）
pnpm run dev
```