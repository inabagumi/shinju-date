# @shinju-date/video-backfill

過去動画の取り込み（バックフィル）ジョブを Redis（Upstash）に積むキュー。管理画面（`apps/admin`）が依頼し、バッチ（`apps/batch` の `/videos/backfill`）が処理します。

## 仕組み

- **1 ジョブ = 1 アカウント**（YouTube チャンネル / Twitch ユーザー）。ジョブ ID は `<provider>:<アカウント行の ID>`
- バッチはジョブを `claim` し、1 ページずつ読んでは進捗（カーソル・追加件数）を記録します。時間内に読み終わらなければ `requeue` でキューの末尾に戻し、次の実行で続きから読みます
- 待機中・処理中のジョブは二重に依頼できません。失敗・中断したジョブは続きから、完了したジョブは最新の動画から読み直します
- 依頼の保存は、読み取った時点からジョブが変わっていないときだけ行う compare-and-set です（`ENQUEUE_SCRIPT`、Redis 上で原子的に実行）。同時に来た依頼や途中で止まった依頼が、互いの進捗やワーカーの進捗を上書きすることはありません。ジョブの保存とキューへの追加は常に一体で行います
- `claim` したジョブはロック（`BACKFILL_LEASE_SECONDS`）され、同じジョブを 2 つのワーカーが同時に読むことはありません。ワーカーが落ちてもロックの期限が切れれば再依頼できます

| 状態      | 意味                             |
| --------- | -------------------------------- |
| `pending` | キューで待機中（初回または続き） |
| `running` | ワーカーが処理中                 |
| `done`    | 履歴を最後まで読んだ             |
| `failed`  | 中止した（再依頼で続きから）     |

## 全アカウントのチェック（`BackfillRuns`）

管理画面の「システム」から、active な全タレントの全アカウントの取得漏れチェックを 1 回の操作で依頼できます。

- 1 回の依頼（チェック）が親、アカウントごとのジョブが子です。子は通常のジョブと同じキューに積まれ、チェックの ID（`runId`）を持ちます。バッチ側の処理は変わりません
- 進捗（待機中 / 取り込み中 / 完了 / 失敗 / 中断の件数と追加本数）は子ジョブの状態から集計します。追加本数は、チェックの依頼時点からの増分です
- 前回のチェックが実行中のあいだは新しいチェックを始められません。同時に来た依頼はロック（`BACKFILL_RUN_LOCK_SECONDS`）で 1 つに絞ります
- タレント詳細から依頼されて待機中・処理中のアカウントは除外して数えます
- 失敗・中断した子ジョブをタレント詳細から再依頼すると、そのままチェックの進捗に反映されます。完了した子ジョブは終了時の結果を残すので、あとで個別に読み直してもチェックの結果は変わりません
- 保持するのは最新のチェックだけです

## 履歴と失敗の再試行

Redis のジョブは最後の変更から 7 日で消えるため、終えたジョブ（`done` / `failed`）はバッチが Supabase に記録します。このパッケージは Redis だけを扱い、記録はバッチ（`apps/batch` の `/videos/backfill`）の担当です。

- `video_backfill_jobs`: 終えたジョブの履歴（依頼者、対象アカウント・タレント、追加本数、読んだページ数、結果、エラー、依頼・開始・終了日時）。1 回の依頼につき 1 行で、失敗から再依頼されて完了したジョブは、追加本数に再依頼前の分も含みます
- `video_backfill_latest_jobs`: アカウントごとの最新の履歴（削除されたアカウント・タレントは除く）。最新が `failed` のアカウントは、失敗が解消されていないものです

管理画面では次のように使います。

- 「システム」の「過去動画の取り込みの履歴」で、履歴と最新が失敗のアカウントを確認し、「失敗したジョブを再試行」でまとめて再依頼できます（待機中・処理中のアカウントは除く）。Redis にジョブが残っていれば失敗したところから、残っていなければ最新の動画から読み直します
- 最新が失敗のアカウントがあるあいだは、ダッシュボードに件数とともに警告を表示します
- バッチは失敗として終えたときのエラーを Sentry にタグ `video_backfill: failed` で報告するので、Sentry のアラートで通知することもできます

## Redis キー

キーはすべて `@shinju-date/constants` の `REDIS_KEYS` で管理し、7 日間の TTL を設定します（チェックの依頼中のロックだけは `BACKFILL_RUN_LOCK_SECONDS`）。

| キー                                                               | 内容                     |
| ------------------------------------------------------------------ | ------------------------ |
| `VIDEO_BACKFILL_JOB_PREFIX` + ジョブ ID                            | ジョブ（JSON）           |
| `VIDEO_BACKFILL_LOCK_PREFIX` + ジョブ ID                           | 処理中のロック           |
| `VIDEO_BACKFILL_QUEUE`                                             | 待機中のジョブ ID の一覧 |
| `VIDEO_BACKFILL_RUN`                                               | 最新のチェック（JSON）   |
| `VIDEO_BACKFILL_RUN_LOCK`                                          | チェックの依頼中のロック |
| `VIDEO_BACKFILL_RUN_RESULT_PREFIX` + チェック ID + `:` + ジョブ ID | 終了した子ジョブの結果   |

## 使い方

```ts
import { BackfillQueue, BackfillRuns } from '@shinju-date/video-backfill'

const queue = new BackfillQueue(redisClient)

// 管理画面: 依頼する
await queue.enqueue({ accountId, provider: 'youtube', requestedBy, talentId })

// バッチ: 処理する
const job = await queue.claim()

// 管理画面: 全アカウントのチェックを依頼し、進捗を読む
const runs = new BackfillRuns(redisClient)

await runs.start(accounts, { requestedBy })
const progress = await runs.getLatest()
```
