# @shinju-date/database

SHINJU DATE のデータベース（Supabase）の型定義と、enum の値を持つ定数を提供するパッケージ。データベースのクライアントは含みません。

## 公開しているもの

### 型

| 名前                  | 内容                                                        |
| --------------------- | ----------------------------------------------------------- |
| `Database`（default） | データベース全体の型。Supabase のクライアントの型引数に渡す |
| `Tables`              | テーブルとビューの行の型（例: `Tables<'videos'>`）          |
| `TablesInsert`        | テーブルに挿入する値の型                                    |
| `TablesUpdate`        | テーブルを更新する値の型                                    |
| `Enums`               | enum の型（例: `Enums<'platform_type'>`）                   |

enum には、名前を付けた型もあります。

| 名前                     | 元の enum                   |
| ------------------------ | --------------------------- |
| `Platform`               | `platform_type`             |
| `VideoStatus`            | `video_status`              |
| `VideoKind`              | `video_kind`                |
| `VideoDeletedReason`     | `video_deleted_reason`      |
| `TwitchVideoType`        | `twitch_video_type`         |
| `TalentStatus`           | `talent_status`             |
| `FeatureRequestStatus`   | `feature_request_status`    |
| `VideoBackfillJobStatus` | `video_backfill_job_status` |
| `AuditAction`            | `audit_action`              |

```typescript
import type Database from '@shinju-date/database'
import type { Platform, Tables, VideoStatus } from '@shinju-date/database'

type Video = Tables<'videos'>

const platform: Platform = 'youtube'
const status: VideoStatus = 'PUBLISHED'
```

### 定数

`Constants` は、enum の値を配列で持つ定数です。型と違い、実行時に使えます。

```typescript
import { Constants } from '@shinju-date/database'

Constants.public.Enums.platform_type // ['youtube', 'twitch']

// 入力値の検証などに使う
const isPlatform = (value: string) =>
  (Constants.public.Enums.platform_type as readonly string[]).includes(value)
```

## 型の生成

`types/supabase.ts` は Supabase CLI が生成するファイルです。手で編集せず、ローカルの Supabase を起動してから、リポジトリのルートで次のコマンドを実行してください。

```bash
pnpm db:schema
```

`src/index.ts` は生成された `Enums` と `Constants` を参照するだけなので、型を生成し直しても直す必要はありません（enum の追加や名前の変更を除く）。

## 開発

```bash
# ビルド
pnpm run build

# テスト
pnpm run test
```
