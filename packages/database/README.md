# @shinju-date/database

SHINJU DATE のデータベース（Supabase）の型定義と、enum の値を持つ定数を提供するパッケージ。データベースのクライアントは含みません。

公開しているものは [`src/index.ts`](src/index.ts) を見てください。中身は、Supabase CLI が生成する [`types/supabase.ts`](types/supabase.ts) の再エクスポートです。

## 使い方

```typescript
import type Database from '@shinju-date/database'
import type { Enums, Tables } from '@shinju-date/database'
import { Constants } from '@shinju-date/database'

type Video = Tables<'videos'>
type Platform = Enums<'platform_type'>

// enum の値は、実行時には Constants から読む
Constants.public.Enums.platform_type // ['youtube', 'twitch']
```

## 型の生成

`types/supabase.ts` は手で編集しません。ローカルの Supabase を起動してから、リポジトリのルートで次のコマンドを実行します。

```bash
pnpm db:schema
```
