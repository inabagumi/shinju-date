# @shinju-date/dashboard-stats

管理画面（`apps/admin`）のダッシュボードの統計の、値の形と数え方。バッチ（`apps/batch` の `/stats/snapshot`）が1日1回スナップショットを Redis に保存し、管理画面が現在値と比べて増減を出します。両方が同じ型と同じ条件を使うことで、比べる値どうしが食い違わないようにします。

## 統計

| 型 | 項目 |
| --- | --- |
| `SummaryStats` | 動画の総数・公開中・予定・非表示・削除済み（`totalVideos` など）、用語の数（`totalTerms`）、タレントの数（`totalTalents`） |
| `AnalyticsSummary` | その日の検索数（`recentSearches`）とクリック数（`recentClicks`）、人気キーワード数（`totalPopularKeywords`） |

- 「公開中」は、`visible = true` かつ `status` が `PUBLIC_VIDEO_STATUSES`（`ENDED` / `LIVE` / `PUBLISHED`）の動画です
- `countSummaryStats` に `asOf` を渡すと、その時点までに作られ、その時点で削除されていなかった行を数えます（スナップショット用）。省略すると現在の件数です。用語は物理削除されるため、`asOf` より後に作られたものだけを除きます
- `asOf` で過去に戻すのは、行の作成と削除（`created_at` / `deleted_at`）だけです。動画の公開状態（`visible`）と配信の状態（`status`）は履歴を持たないため、数えた時点の値で分けます（[スナップショットの時点](#スナップショットの時点)）
- 人気キーワード数は、全期間のランキング（`REDIS_KEYS.SEARCH_POPULAR_ALL_TIME`）の件数です

## スナップショットの時点

バッチは毎日 0:10（日本時間）ごろに、前日の日付のキーへスナップショットを保存します。`SummaryStats` の各項目の時点は次のとおりです。

| 項目 | 時点 |
| --- | --- |
| `totalVideos`、`deletedVideos`、`totalTerms`、`totalTalents` | 前日の終わり（当日の 0:00）。`asOf` で作成と削除の時刻を比べます |
| `visibleVideos`、`scheduledVideos`、`hiddenVideos` | 前日の終わりまでにあった動画を、ジョブを実行した時点（当日の 0:10 ごろ）の `visible` と `status` で分けた件数 |

公開状態と配信の状態は履歴を持たないため、`asOf` を渡しても過去の値には戻りません。0:00 からジョブの実行までの間に配信が始まったり非表示にされたりした動画は、変わった後の状態で数えます。ステータス別の推移は「前日の終わりの厳密な状態」ではなく、「その日の終わりまでにあった動画の、翌日 0:10 ごろの状態」として扱ってください。

## Redis キー

キーはすべて `@shinju-date/constants` の `REDIS_KEYS` で管理します。日付は `@shinju-date/temporal-fns` の `formatDateKey` で作ります。

| キー | 内容 | TTL |
| --- | --- | --- |
| `SUMMARY_STATS_PREFIX` + 日付 | `SummaryStats` のスナップショット | 45日（`SUMMARY_SNAPSHOT_TTL_SECONDS`） |
| `SUMMARY_ANALYTICS_PREFIX` + 日付 | `AnalyticsSummary` のスナップショット | 30日（`ANALYTICS_SNAPSHOT_TTL_SECONDS`） |

- `SummaryStats` は、過去30日の日別の増減を出すために、連続した31日分（30日と、その前日の比較元）を読みます。最も古いものは、保存（その日の翌日の 0:10）からおよそ31日後まで読まれるため、ジョブの遅れや再実行の余裕を見て45日にしています
- `AnalyticsSummary` は前日と前週としか比べないため、30日のままにしています。`SummaryStats` だけの都合で延ばしません
- TTL は保存するときに付けるため、変更は変えた後に保存するスナップショットにだけ効きます。すでに失効したものは戻らないので、31日分がそろうまでは、足りない日を欠損として扱ってください

読んだ値がないとき、またはスキーマ（`summaryStatsSchema` / `analyticsSummarySchema`）に合わないときは、例外にせず `null` を返します。ジョブが失敗した日や、TTL で失効した日も `null` です。0件として扱わないでください。

## 使い方

```ts
import {
  collectAnalyticsSummary,
  countSummaryStats,
  readSummarySnapshot,
  withTrends,
  writeAnalyticsSnapshot,
  writeSummarySnapshot,
} from "@shinju-date/dashboard-stats";

// バッチ: 前日のスナップショットを保存する
const [stats, analytics] = await Promise.all([
  countSummaryStats(supabaseClient, { asOf }),
  collectAnalyticsSummary(redisClient, dateKey),
]);
await Promise.all([
  writeSummarySnapshot(redisClient, dateKey, stats),
  writeAnalyticsSnapshot(redisClient, dateKey, analytics),
]);

// 管理画面: 現在値に前日・前週との差を付ける
const [current, yesterday, lastWeek] = await Promise.all([
  countSummaryStats(supabaseClient),
  readSummarySnapshot(redisClient, yesterdayKey),
  readSummarySnapshot(redisClient, lastWeekKey),
]);
const trends = withTrends(current, yesterday, lastWeek);
```
