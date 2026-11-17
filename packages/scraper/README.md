# @shinju-date/scraper

YouTube / Twitch の動画とアカウントを、SHINJU DATE のデータベースに取り込んで同期するパッケージ。

プラットフォームからの取得だけでなく、保存済みデータとの差分判定、データベースへの書き込み、サムネイルの保存までを担当します。プラットフォームの API を呼ぶ処理そのものは `@shinju-date/youtube-api-client` / `@shinju-date/twitch-api-client` に任せています。

## 使い方

```typescript
import { YouTubeScraper } from '@shinju-date/scraper/youtube'
import { TwitchScraper } from '@shinju-date/scraper/twitch'

const scraper = new YouTubeScraper({
  supabaseClient, // 書き込み権限のある Supabase クライアント
  logger,
  onError: (error, context) =>
    Sentry.captureException(error, { extra: context }),
})

const changed = await scraper.addNewVideos()
```

すべてのスクレイパーは基底クラス `Scraper`（`@shinju-date/scraper`）を継承し、同じ操作を持ちます。呼び出し側はプロバイダーを意識せずに使えます。

| 操作                        | 内容                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `addNewVideos()`            | 追跡中のアカウントに現れた動画を保存する。保存済みの動画には触れない                 |
| `refreshLiveVideos()`       | 配信予定・配信中の動画を追う（開始、タイトル変更、終了）                             |
| `refreshRecentVideos()`     | 終了済みの最新動画を再取得し、変更を反映する。取得できなくなった動画は削除扱いにする |
| `removeUnavailableVideos()` | 保存済みの全動画を確認し、取得できなくなった動画を削除扱いにする                     |
| `refreshVideo(videoId)`     | 保存済みの動画 1 件を再取得し、変更を反映する（取得できなければ削除扱いにする）      |
| `syncAccounts()`            | 保存済みアカウントの名前・ハンドル・アイコンをプラットフォームに合わせる             |
| `syncTalentAccounts(id)`    | タレント 1 人のアカウントについて、`syncAccounts()` と同じ同期をする                 |
| `addPastVideos(options)`    | 1 アカウントの全履歴を 1 ページ読み、未保存の動画を保存する（バックフィル）          |

- `addPastVideos`、`refreshVideo`、`syncTalentAccounts` 以外の操作は「公開サイトに見える変更があったか」を `boolean` で返します（キャッシュ再検証の判断に使えます）。
- 引数に実行時刻（`Temporal.Instant`）を渡すと、その実行で書き込む行のタイムスタンプが揃います。省略時は現在時刻です。

### 過去動画の取り込み（`addPastVideos`）

`addNewVideos` は各アカウントの最新の動画しか見ないため、追跡を始める前の動画や、最新ページから外れた古い動画は保存されません。`addPastVideos` はそれを補う操作で、1 アカウントの履歴を新しい順に 1 ページずつ読み、未保存の動画だけを `addNewVideos` と同じ経路で保存します。

```ts
let cursor: string | null = null

do {
  const result = await scraper.addPastVideos({
    accountId, // youtube_channels.id / twitch_users.id
    cursor,
  })

  cursor = result.cursor // null なら履歴の最後まで読んだ
} while (cursor)
```

- 1 回の呼び出しは 1 ページ（YouTube は 50 件、Twitch は 100 件）だけなので、長い履歴も複数回の実行に分けて読めます。
- 対象は削除されていないタレントのアカウントです（引退したタレントも含む）。アカウントが見つからなければ `AccountNotFoundError` で reject します。
- Twitch はアーカイブとアップロードが対象です（ハイライトは対象外。`addNewVideos` と同じ）。
- サムネイルの同時処理数は `addNewVideos` より抑えています。

### 動画 1 件の見直し（`refreshVideo`）

管理画面の「動画を同期」のように、動画 1 件を指定して見直すための操作です。定期の見直しと同じ関数（差分の判定、項目への変換、論理削除）を使うので、同じ動画は同じ項目が同じ値に更新されます。

```ts
const result = await scraper.refreshVideo(videoId) // videos.id

switch (result.status) {
  case 'updated': // result.before / result.after は変わった項目だけを持つ
  case 'unchanged':
    console.log(result.title)
    break
  case 'unavailable': // プラットフォームから消えていたので、論理削除した
  case 'not-found': // 保存済みの動画がない（削除済みを含む）、または、そのプラットフォームの動画ではない
    break
}
```

- 更新する項目は、定期の見直しと同じです（タイトル、長さ、開始日時、状態、種別）。`before` と `after` は、変わった項目だけを持ちます（監査ログ向け）。
- 定期の見直しと違い、動画の状態やタレントの状態を問わずに見直します。
- 1 件だけを扱うので、プラットフォームやデータベースを読めなければ reject します（サムネイルを保存できない場合だけは、ほかの操作と同じく `onError` に渡します）。
- **Twitch** は、配信中の行と、アーカイブが分からないままの行（プレースホルダー）を、配信の状態から見直します（`refreshLiveVideos` と同じ）。アーカイブが見つかれば結び付けます（`addNewVideos` と同じ。配信中なら LIVE のまま）。クリップは、クリップとして確認します。
- Twitch でアーカイブへの結び付けやサムネイルだけが変わった場合も `updated` を返します（`before` と `after` は空）。

型 `RefreshVideoResult` は `@shinju-date/scraper` から import できます。

### タレント 1 人のアカウントの同期（`syncTalentAccounts`）

管理画面の「同期」のように、タレント 1 人を指定して、そのアカウントの名前・ハンドル（Twitch は login）・アイコンを同期するための操作です。`syncAccounts` と同じ関数を使うので、変更があったアカウントだけが更新されます。

```ts
const results = await scraper.syncTalentAccounts(talentId) // talents.id

for (const result of results) {
  result.accountId // youtube_channels.id / twitch_users.id
  result.name // プラットフォームの名前（同期できなかったときは保存済みの名前）
  result.status // 'updated' | 'unchanged' | 'not-found' | 'failed'
  result.changes // 名前・ハンドルが変わったときだけ。変わった項目の before / after
  result.iconUpdated // アイコンを保存・差し替え・削除したか
}
```

- 結果は、タレントの保存済みのアカウントごとに 1 件です。アカウントがないタレントや、削除済みのタレントでは空になります（引退したタレントは対象です）。
- `not-found` はプラットフォームがアカウントを返さなかった場合、`failed` は名前・ハンドルを書き込めなかった場合です（失敗は `onError` に渡します）。Twitch は名前とアイコンを独立して同期するので、`failed` でも `iconUpdated` が `true` になることがあります。
- 1 人だけを扱うので、プラットフォームやデータベースを読めなければ reject します。
- 使われなくなったアイコンの削除は行いません（定期の `syncAccounts` が行います）。

型 `SyncAccountResult` は `@shinju-date/scraper` から import できます。

### 失敗の扱い

- **1 アカウント・1 動画の失敗では止まりません。** その失敗は `onError(error, context)` に渡され、残りは処理されます。`onError` を省略すると `logger` に出力します。
- **実行全体が続けられない場合だけ reject します**（プラットフォームやデータベースに到達できない、など）。この場合は何も削除しません。
- **削除扱いにするのは、プラットフォームが返さなかった ID だけです。** リクエスト自体が失敗したときに「存在しない」と誤認することはありません。

### オプション

| オプション       | 内容                                                      |
| ---------------- | --------------------------------------------------------- |
| `supabaseClient` | 必須。読み書きに使う Supabase クライアント                |
| `logger`         | `debug` / `info` / `warn` / `error` を持つロガー          |
| `onError`        | 実行を止めない失敗の通知先                                |
| `concurrency`    | プラットフォーム API への同時リクエスト数の上限（既定 5） |
| `client`         | API クライアントの差し替え（主にテスト用）                |

## プロバイダーごとの違い

紐づけテーブルや「配信」の扱いはプロバイダーごとに異なるため、保存の仕方は各スクレイパーの中に閉じています。

- **YouTube**: 配信予定・配信中の動画もチャンネルのアップロード一覧に載るので、`addNewVideos` で見つけ、`refreshLiveVideos` で終了まで追います。
- **Twitch**: 配信予定を事前に取得する手段がないため、`refreshLiveVideos` が配信開始を検出して LIVE の行を作り、配信終了で終了扱いにします。`addNewVideos` はアーカイブを見つけると、その行に紐づけます（二重に保存しません）。Twitch は配信開始と同時にアーカイブを作るので、配信中に見つかったアーカイブは LIVE のまま扱います。

### アイコンの同期（YouTube）

`YouTubeScraper#syncAccounts()` は、チャンネル名・ハンドルと同じ流れでチャンネルのアイコンも同期します。

- `snippet.thumbnails` から、256px 以上で最小の正方形画像を選びます（`selectYouTubeChannelIconUrl`）。該当がなければ最大の正方形画像、正方形のサイズが分からなければ最大の画像を使います（保存時に正方形へ切り抜かれます）
- 元画像の URL・ETag が変わっていなければダウンロードも保存もしません。変わったときだけ新しいアイコンを保存して差し替えます
- アイコンの取得・保存に失敗しても、名前・ハンドルの同期は止めません。失敗は `onError` に `operation: 'syncProfileImage'` 付きで渡されます
- 最後に、どのチャンネル・ユーザーにも使われなくなったアイコン（削除したチャンネルのものなど）を削除します

### アイコンの同期（Twitch）

`TwitchScraper#syncAccounts()` は、表示名・login と同じ流れでユーザーのアイコンも同期します。

- Helix API の `profile_image_url`（300x300）をそのまま使います（`selectTwitchUserIconUrl`）。空の URL、HTTPS 以外の URL、Twitch の既定アイコン（`/user-default-pictures*/`）はアイコンなしとして扱い、保存済みのアイコンがあれば外します
- 元画像の URL・ETag が変わっていなければダウンロードも保存もしません。変わったときだけ新しいアイコンを保存して差し替えます
- 表示名・login の更新とアイコンの同期は独立しています。どちらかが失敗しても、もう一方は同期されます。アイコンの失敗は `onError` に `operation: 'syncProfileImage'` 付きで渡されます
- 使われなくなったアイコンの削除は YouTube の同期がプラットフォームを問わずに行うため、Twitch 側では行いません

アイコンの書き込みには service role の Supabase クライアントが必要です。管理画面からのチャンネル（ユーザー）追加では、`@shinju-date/scraper/youtube` の `syncYouTubeChannelIcon`、`@shinju-date/scraper/twitch` の `syncTwitchUserIcon` を直接使います。

## プロバイダーを追加する

1. `Scraper` を継承したクラスを作り、すべての操作を実装します。プラットフォーム固有の紐づけテーブルへの書き込みもここに書きます。
2. プラットフォームからの取得は、内部の基底クラス `Fetcher` を継承すると、ID の重複除去とバッチ化・並行数の制御・アカウント単位の失敗の切り離しをそのまま使えます。

既存の `youtube/` と `twitch/` が実装例です。

## 環境変数

API クライアントを差し替えない場合に必要です。

```bash
# YouTube
GOOGLE_API_KEY=

# Twitch
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
```

## 開発

```bash
pnpm run build
pnpm run test
```

テストはプラットフォームの API とデータベース（Supabase）だけを差し替え、ネットワークには出ません。
