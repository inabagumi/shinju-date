# @shinju-date/video-backfill

過去動画の取り込み（バックフィル）ジョブを Redis（Upstash）に積むキュー。管理画面（`apps/admin`）が依頼し、バッチ（`apps/batch` の `/videos/backfill`）が処理します。

## 仕組み

- **1 ジョブ = 1 アカウント**（YouTube チャンネル / Twitch ユーザー）。ジョブ ID は `<provider>:<アカウント行の ID>`
- バッチはジョブを `claim` し、1 ページずつ読んでは進捗（カーソル・追加件数）を記録します。時間内に読み終わらなければ `requeue` でキューの末尾に戻し、次の実行で続きから読みます
- 待機中・処理中のジョブは二重に依頼できません。失敗・中断したジョブは続きから、完了したジョブは最新の動画から読み直します
- 同じアカウントへの依頼は 1 件ずつ処理し（`VIDEO_BACKFILL_ENQUEUE_LOCK_PREFIX`）、同時に来た依頼が互いの進捗を上書きしないようにしています。ジョブの保存とキューへの追加は 1 つのトランザクションで行います
- `claim` したジョブはロック（`BACKFILL_LEASE_SECONDS`）され、同じジョブを 2 つのワーカーが同時に読むことはありません。ワーカーが落ちてもロックの期限が切れれば再依頼できます

| 状態      | 意味                             |
| --------- | -------------------------------- |
| `pending` | キューで待機中（初回または続き） |
| `running` | ワーカーが処理中                 |
| `done`    | 履歴を最後まで読んだ             |
| `failed`  | 中止した（再依頼で続きから）     |

## Redis キー

キーはすべて `@shinju-date/constants` の `REDIS_KEYS` で管理し、7 日間の TTL を設定します。

| キー                                             | 内容                     |
| ------------------------------------------------ | ------------------------ |
| `VIDEO_BACKFILL_JOB_PREFIX` + ジョブ ID          | ジョブ（JSON）           |
| `VIDEO_BACKFILL_LOCK_PREFIX` + ジョブ ID         | 処理中のロック           |
| `VIDEO_BACKFILL_ENQUEUE_LOCK_PREFIX` + ジョブ ID | 依頼の受付中のロック     |
| `VIDEO_BACKFILL_QUEUE`                           | 待機中のジョブ ID の一覧 |

## 使い方

```ts
import { BackfillQueue } from '@shinju-date/video-backfill'

const queue = new BackfillQueue(redisClient)

// 管理画面: 依頼する
await queue.enqueue({ accountId, provider: 'youtube', requestedBy, talentId })

// バッチ: 処理する
const job = await queue.claim()
```
