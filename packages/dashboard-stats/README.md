# @shinju-date/dashboard-stats

管理画面（`apps/admin`）のダッシュボードの統計の、値の形と数え方。バッチ（`apps/batch` の `/stats/snapshot`）が1日1回スナップショットを Redis に保存し、管理画面が現在値と比べて増減を出します。両方が同じ型と同じ条件を使うことで、比べる値どうしが食い違わないようにします。

## 統計

| 型                 | 項目                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `SummaryStats`     | 動画の総数・公開中・予定・非表示・削除済み（`totalVideos` など）、用語の数（`totalTerms`）、タレントの数（`totalTalents`） |
| `AnalyticsSummary` | その日の検索数（`recentSearches`）とクリック数（`recentClicks`）、人気キーワード数（`totalPopularKeywords`）               |

- 「公開中」は、`visible = true` かつ `status` が `PUBLIC_VIDEO_STATUSES`（`ENDED` / `LIVE` / `PUBLISHED`）の動画です
- `countSummaryStats` に `asOf` を渡すと、その時点までに作られ、その時点で削除されていなかった行を数えます（スナップショット用）。省略すると現在の件数です。用語は物理削除されるため、`asOf` より後に作られたものだけを除きます
- 人気キーワード数は、全期間のランキング（`REDIS_KEYS.SEARCH_POPULAR_ALL_TIME`）の件数です

## Redis キー

キーはすべて `@shinju-date/constants` の `REDIS_KEYS` で管理し、30日間の TTL（`SNAPSHOT_TTL_SECONDS`）を設定します。日付は `@shinju-date/temporal-fns` の `formatDateKey` で作ります。

| キー                              | 内容                                  |
| --------------------------------- | ------------------------------------- |
| `SUMMARY_STATS_PREFIX` + 日付     | `SummaryStats` のスナップショット     |
| `SUMMARY_ANALYTICS_PREFIX` + 日付 | `AnalyticsSummary` のスナップショット |

読んだ値がスキーマ（`summaryStatsSchema` / `analyticsSummarySchema`）に合わないときは、例外にせず `null` を返します。

## 使い方

```ts
import {
  collectAnalyticsSummary,
  countSummaryStats,
  readSummarySnapshot,
  withTrends,
  writeAnalyticsSnapshot,
  writeSummarySnapshot,
} from '@shinju-date/dashboard-stats'

// バッチ: 前日のスナップショットを保存する
const [stats, analytics] = await Promise.all([
  countSummaryStats(supabaseClient, { asOf }),
  collectAnalyticsSummary(redisClient, dateKey),
])
await Promise.all([
  writeSummarySnapshot(redisClient, dateKey, stats),
  writeAnalyticsSnapshot(redisClient, dateKey, analytics),
])

// 管理画面: 現在値に前日・前週との差を付ける
const [current, yesterday, lastWeek] = await Promise.all([
  countSummaryStats(supabaseClient),
  readSummarySnapshot(redisClient, yesterdayKey),
  readSummarySnapshot(redisClient, lastWeekKey),
])
const trends = withTrends(current, yesterday, lastWeek)
```
