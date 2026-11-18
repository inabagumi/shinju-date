# @shinju-date/video-backfill

過去動画の取り込み（バックフィル）ジョブを Redis（Upstash）に積むキュー。管理画面（`apps/admin`）が依頼し、バッチ（`apps/batch` の `/videos/backfill`）が処理します。

## 仕組み

- **1 ジョブ = 1 アカウント**（YouTube チャンネル / Twitch ユーザー）。ジョブ ID は `<provider>:<アカウント行の ID>`
- バッチはジョブを `claim` し、1 ページずつ読んでは `recordPage` で進捗（カーソル・追加件数）を記録します。最後のページなら、`recordPage` がジョブを終えます。時間内に読み終わらなければ `requeue` でキューの末尾に戻し、次の実行で続きから読みます
- ページを読めなかったときは `recordFailure` で記録します。試した回数を増やし、最大の回数（`BackfillQueue` を作るときの `maxAttempts`、既定は `BACKFILL_MAX_ATTEMPTS`）に達したか、`permanent`（アカウントが消えた、など）なら `failed` にし、そうでなければキューに戻して次の実行で再試行します。ジョブの項目を書き換えるのはこのパッケージだけで、バッチは直接書き換えません
- 待機中・処理中のジョブは二重に依頼できません。失敗・中断したジョブは続きから、完了したジョブは最新の動画から読み直します
- 依頼の保存は、読み取った時点からジョブが変わっていないときだけ行う compare-and-set です（`ENQUEUE_SCRIPT`、Redis 上で原子的に実行）。ジョブは番号（`version`）を持ち、書き込むたびに 1 増やします。依頼は、読み取ったときの番号と Redis のジョブの番号を比べます（番号のない、保存済みのジョブは 0 として扱います）。同時に来た依頼や途中で止まった依頼が、互いの進捗やワーカーの進捗を上書きすることはありません。ジョブの保存とキューへの追加は常に一体で行います
- `claim` したジョブはロックされ、同じジョブを 2 つのワーカーが同時に読むことはありません。ロックの長さ（`leaseSeconds`）は、`BackfillQueue` を作るときの「1 回の実行の最長の時間」（`maxRunSeconds`、バッチはルートの `maxDuration` を渡す）に、余裕（`BACKFILL_LEASE_MARGIN_SECONDS`）を足したものです。ワーカーが落ちてもロックの期限が切れれば再依頼できます
- `claim` は、キューからの取り出し・ロック・`running` への更新を 1 つのスクリプト（`CLAIM_SCRIPT`）で行います。途中で止まっても、キューから消えたのに `pending` のまま、というジョブは残りません
- ロックの値は `claim` のたびに作るトークンです。`claim` はジョブとトークン（`BackfillClaim`）を返し、`recordPage`・`recordFailure`・`requeue` は、ロックがそのトークンを持っているときだけ書き込みます。ロックの期限が切れたあと（別のワーカーが取り出したかもしれない）は何も書き込まず、`{ status: 'lost' }` を返すので、バッチはそのジョブの処理をやめて次へ進みます

| 状態      | 意味                             |
| --------- | -------------------------------- |
| `pending` | キューで待機中（初回または続き） |
| `running` | ワーカーが処理中                 |
| `done`    | 履歴を最後まで読んだ             |
| `failed`  | 中止した（再依頼で続きから）     |

状態の遷移は `BACKFILL_JOB_TRANSITIONS` の表 1 つで決めます。操作（`claim`、`enqueue`、`recordPage`、`complete`、`fail`、`requeue`）ごとに、どの状態から、どの状態へ進めるかを持ち、`BackfillQueue` は表にない遷移（終わったジョブを進める、など）を `BackfillTransitionError` にします。

`pending` や `running` のまま、待機も処理もされていないジョブは「中断」（`interrupted`）です。この判定は `getJobActivity(job, { locked })` の 1 か所で行い、`getJobs`、`BackfillRuns`、管理画面の表示が使います。

## ファイル

| ファイル         | 中身                                                               |
| ---------------- | ------------------------------------------------------------------ |
| `src/types.ts`   | ジョブと結果の型                                                   |
| `src/keys.ts`    | Redis のキーの作り方と、有効期限の定数                             |
| `src/jobs.ts`    | 状態の遷移（`BACKFILL_JOB_TRANSITIONS`）と判定（`getJobActivity`） |
| `src/scripts.ts` | Lua のスクリプトと、それを呼び出す関数                             |
| `src/queue.ts`   | `BackfillQueue`                                                    |
| `src/runs.ts`    | 全アカウントのチェック（`BackfillRuns`）                           |

## 全アカウントのチェック（`BackfillRuns`）

管理画面の「システム」から、active な全タレントの全アカウントの取得漏れチェックを 1 回の操作で依頼できます。

- 1 回の依頼（チェック）が親、アカウントごとのジョブが子です。子は通常のジョブと同じキューに積まれ、チェックの ID（`runId`）を持ちます。バッチ側の処理は変わりません
- 進捗（待機中 / 取り込み中 / 完了 / 失敗 / 中断の件数と追加本数）は子ジョブの状態から集計します。追加本数は、チェックの依頼時点からの増分です
- 前回のチェックが実行中のあいだは新しいチェックを始められません。同時に来た依頼はロック（`BACKFILL_RUN_LOCK_SECONDS`）で 1 つに絞ります
- タレント詳細から依頼されて待機中・処理中のアカウントは除外して数えます
- 失敗・中断した子ジョブをタレント詳細から再依頼すると、そのままチェックの進捗に反映されます。完了した子ジョブは終了時の結果を残すので、あとで個別に読み直してもチェックの結果は変わりません
- 終了時の結果は、`BackfillQueue` を作るときの `finishedJobKeys` に `getBackfillRunResultKeys` を渡すと、ジョブを終える保存と同じスクリプト（`FINISH_SCRIPT`）の中で書き込まれます（バッチが渡します）。途中で止まっても、ジョブだけが終わって結果が残らない、ということはありません。`BackfillQueue` は、渡されたキーにジョブを書き込むだけで、チェックのことは知りません
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

キーはすべて `@shinju-date/constants` の `REDIS_KEYS` で管理し、7 日間の TTL を設定します（処理中のジョブのロックは `BackfillQueue` の `leaseSeconds`、チェックの依頼中のロックは `BACKFILL_RUN_LOCK_SECONDS`）。

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
import {
  BackfillQueue,
  BackfillRuns,
  getBackfillRunResultKeys,
} from '@shinju-date/video-backfill'

// 管理画面: 依頼する
const queue = new BackfillQueue(redisClient)

await queue.enqueue({ accountId, provider: 'youtube', requestedBy, talentId })

// バッチ: 処理する（ロックは、実行の最長の時間と余裕のぶん）
const worker = new BackfillQueue(redisClient, {
  maxRunSeconds: maxDuration,
  // 終えた子ジョブの結果を、チェックのために、ジョブと一緒に残す
  finishedJobKeys: getBackfillRunResultKeys,
})
const claim = await worker.claim()

if (claim) {
  let result

  try {
    const page = await scraper.addPastVideos({
      accountId,
      cursor: claim.job.cursor,
    })

    result = await worker.recordPage(claim, {
      added: page.added,
      done: page.cursor === null,
      nextCursor: page.cursor,
    })
  } catch (error) {
    result = await worker.recordFailure(claim, error, {
      permanent: error instanceof AccountNotFoundError,
    })
  }

  if (result.status === 'lost') {
    // ロックが切れた: このジョブの処理をやめる
  }
}

// 管理画面: 全アカウントのチェックを依頼し、進捗を読む
const runs = new BackfillRuns(redisClient)

await runs.start(accounts, { requestedBy })
const progress = await runs.getLatest()
```

## テスト

`BackfillQueue` と `BackfillRuns` のテスト（`src/queue.test.ts`、`src/runs.test.ts`）は、同じ一式を、本物の Redis と、模倣（`FakeRedis`）の両方に対して実行します（`test/redis.ts` の `describeOnEachRedis`）。Lua のスクリプトは本物の Redis で実行され、模倣のほうは、本物と同じ結果を返すことを確かめます。

- 本物の Redis に対するテストは、`UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` が設定されているときだけ動きます。ないときはスキップします。CI では、`services` で Redis と Serverless Redis HTTP を起動して動かします
- テストごとに、キーの接頭辞（`test:video-backfill:<UUID>:`）を変え、終わったら使ったキーを消します

ローカルでは、`compose.yml` の Redis を起動して（[ローカルRedis環境](../../docs/setup-guide.md#4-ローカルredis環境)）、次のように実行します。トークンは `config/dev-secrets.env` の `SRH_TOKEN` です。

```bash
UPSTASH_REDIS_REST_URL=http://localhost:8079 UPSTASH_REDIS_REST_TOKEN=<SRH_TOKEN> pnpm run test --filter=@shinju-date/video-backfill
```

### 模倣（`@shinju-date/video-backfill/testing`）

Lua を実行できない環境のために、スクリプトの模倣を、このパッケージの `./testing` の入口から公開しています。スクリプトの模倣は、リポジトリの中でここだけです。

- `SCRIPT_EMULATIONS`: スクリプトの名前（1行目のコメント、例: `-- video-backfill:enqueue`）ごとに、スクリプトが実行するコマンドで同じ動きをする関数
- `FakeRedis`: キューが使う `@upstash/redis` のメソッドを、メモリの上で動かすもの。スクリプトは `SCRIPT_EMULATIONS` で動かします

`@shinju-date/msw-handlers` の Upstash のモックも、`EVAL` を受けると `SCRIPT_EMULATIONS` を使います。スクリプトを変えたら、`src/testing/scripts.ts` の模倣も同じように直してください（直し忘れると、`FakeRedis` に対するテストが失敗します）。本番のコードからは import しないでください。
