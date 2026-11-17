# ハイブリッドオススメクエリシステム

このドキュメントでは、時間減衰スコアを考慮したハイブリッド方式のオススメクエリシステムの実装について説明します。

## 概要

このシステムは、以下の2つの要素を組み合わせてオススメクエリを提供します：

1. **手動キュレーション**: 管理者が重要なクエリを手動で追加・削除
2. **自動選出**: 検索トレンドに基づいて時間減衰スコアリングで自動的に選出

## アーキテクチャ

### Redis キー構造

#### 検索トラッキング用キー（Sorted Set）

- `search:popular:daily:{YYYYMMDD}` - 日次検索カウント（TTL: 90日間）
- `search:popular:weekly:{YYYYMMDD}` - 週次検索カウント（TTL: 35日間）
  - キーの日付は週の月曜日を表す
- `search:popular:all_time` - 全期間検索カウント（TTL: なし）

#### オススメクエリ用キー

- `queries:manual_recommended` (Set) - 手動で追加されたオススメクエリ
- `queries:auto_recommended` (Sorted Set) - 自動選出されたオススメクエリ（スコア付き）
- `search:popular:temp_union` (Sorted Set) - 自動選出バッチが重み付き集計に使う一時キー（処理の終わりに削除）

キーは、すべて `packages/constants/src/index.ts` の `REDIS_KEYS` に定義されています。日付は `@shinju-date/temporal-fns` の `formatDateKey`（`YYYYMMDD`）で作ります。

結合済みのオススメクエリは Redis には保存せず、公開サイトの `'use cache: remote'` でキャッシュします（キャッシュタグ: `CACHE_TAGS.RECOMMENDATION_QUERIES`）。

### コンポーネント

#### 1. 検索ログ記録 (`apps/web/lib/search-analytics.ts`)

すべてのユーザー検索時に、前後の空白を除いて小文字にしたクエリで、以下のキーを更新します：

```text
search:popular:daily:{today}     ZINCRBY +1（TTL: 90日）
search:popular:weekly:{monday}   ZINCRBY +1（TTL: 35日）
search:popular:all_time          ZINCRBY +1
```

日付は `TIME_ZONE`（`@shinju-date/constants`）の現在時刻から求めます。週の月曜日の日付は、`@shinju-date/temporal-fns` の `getMondayOfWeek` で求めます。

#### 2. 自動オススメ集計バッチ (`apps/batch/app/recommendation/queries/update/route.ts`)

**実行頻度**: 毎日1回 (cron: `17 1 * * *`)

**処理フロー**:

1. 現在の日次・週次・全体のキーを取得
2. `ZUNIONSTORE` で重み付き集計を実行
   - 日次: 重み 10.0
   - 週次: 重み 5.0
   - 全体: 重み 1.0
3. Supabaseから用語集の全単語と類義語を取得
4. 集計結果から用語集の単語か類義語に一致するクエリのみを残し、用語集の単語に置き換える（同じ単語になったものは、高いほうのスコアを使う）
5. スコア降順でソート
6. `queries:auto_recommended` に保存
7. 公開サイトの `CACHE_TAGS.RECOMMENDATION_QUERIES` のタグを再検証

**重なりの防止**: 前の実行が終わるまで、次の実行は 429 になる

#### 3. 手動オススメ管理 (`apps/admin/app/(dashboard)/recommended-queries/`)

管理ページで以下の操作が可能：

- **追加**: `queries:manual_recommended` に文字列を追加
- **削除**: `queries:manual_recommended` から文字列を削除
- **表示**: 手動/自動のオススメクエリを分けて表示

#### 4. 公開サイト表示

オススメクエリは、検索モーダル（`apps/web/app/_components/search-modal-content.tsx`）と、動画の検索結果が0件のときのメッセージ（`apps/web/app/videos/[[...queries]]/_components/videos-page-sections.tsx`）に表示されます。

**取得ロジック** (`apps/web/lib/recommendations/get-combined-queries.ts`):

1. `queries:manual_recommended` から手動クエリを取得
2. `queries:auto_recommended` から自動クエリを取得（スコア降順）
3. 手動クエリを先頭に、その後に重複を除いた自動クエリを追加

この関数の結果だけを `'use cache: remote'`（`cacheLife('minutes')`、`cacheTag(CACHE_TAGS.RECOMMENDATION_QUERIES)`）でキャッシュします。

**表示するクエリの選び方** (`apps/web/lib/recommendations/get-display-queries.ts`):

結合したクエリから、最大4件を選んで表示します。

- 4件以下のときは、すべてを表示
- 5件以上のときは、上位2件（手動追加が優先）を固定で表示し、残りの2件を3〜20位からランダムに選ぶ

上位のクエリを常に見せつつ、表示のたびに違うクエリにも触れられるようにしています。選ぶ処理はキャッシュの外で行うので、読み込むたびに変わります。

## 設定パラメータ

### 時間減衰の重み

```typescript
const WEIGHT_DAILY = 10.0 // 日次データの重み
const WEIGHT_WEEKLY = 5.0 // 週次データの重み
const WEIGHT_ALL_TIME = 1.0 // 全期間データの重み
```

これらの重みにより、最近の検索が過去の検索よりも大きく評価されます。

### TTL設定

```typescript
DAILY_TTL = 90日間 (7,776,000秒)
WEEKLY_TTL = 35日間 (3,024,000秒)
```

## 動作確認方法

### 1. 検索ログが正しく記録されているか確認

```bash
# Redisに接続
redis-cli

# 今日の日次キーを確認
ZRANGE search:popular:daily:20251020 0 -1 WITHSCORES

# 今週の週次キーを確認（月曜日の日付）
ZRANGE search:popular:weekly:20251020 0 -1 WITHSCORES

# 全期間キーを確認
ZRANGE search:popular:all_time 0 -1 WITHSCORES
```

### 2. 自動オススメが生成されているか確認

```bash
# バッチジョブを手動実行
curl -X POST https://your-domain.com/recommendation/queries/update \
  -H "Authorization: Bearer ${CRON_SECRET}"

# 自動オススメを確認
ZRANGE queries:auto_recommended 0 -1 WITHSCORES REV
```

### 3. 手動オススメを管理

管理画面（`/recommended-queries`）にアクセスして：

- 新しいクエリを追加
- 既存のクエリを削除
- 手動/自動のクエリリストを確認

### 4. 公開サイトでの表示確認

公開サイトで検索モーダルを開き、キーワードを入力する前に、オススメクエリが表示されることを確認。

## トラブルシューティング

### オススメクエリが表示されない

1. Redisの接続を確認
2. `queries:manual_recommended` と `queries:auto_recommended` の内容を確認
3. 公開サイトの `recommendation-queries` のタグを再検証する（キャッシュは `cacheLife('minutes')` の期限でも切れる）

### 自動オススメが更新されない

1. バッチジョブのログを確認（Sentry）
2. 検索データが蓄積されているか確認
3. 用語集（terms テーブル）にデータがあるか確認

### 古いデータが残っている

TTLが設定されているキーは自動的に削除されます。手動で削除する場合：

```bash
# 古い日次キーを削除
DEL search:popular:daily:20251001

# 古い週次キーを削除
DEL search:popular:weekly:20250929
```

## 今後の改善案

- 重みパラメータの動的調整
- クリックスルー率（CTR）の追跡と反映
- 季節性・イベント対応の自動調整
- A/Bテストによる最適化
