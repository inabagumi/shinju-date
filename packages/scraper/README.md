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

すべてのスクレイパーは基底クラス `Scraper`（`@shinju-date/scraper`）を継承し、同じ 5 つの操作を持ちます。呼び出し側はプロバイダーを意識せずに使えます。

| 操作                        | 内容                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `addNewVideos()`            | 追跡中のアカウントに現れた動画を保存する。保存済みの動画には触れない                 |
| `refreshLiveVideos()`       | 配信予定・配信中の動画を追う（開始、タイトル変更、終了）                             |
| `refreshRecentVideos()`     | 終了済みの最新動画を再取得し、変更を反映する。取得できなくなった動画は削除扱いにする |
| `removeUnavailableVideos()` | 保存済みの全動画を確認し、取得できなくなった動画を削除扱いにする                     |
| `syncAccounts()`            | 保存済みアカウントの名前・ハンドルをプラットフォームに合わせる                       |

- どの操作も「公開サイトに見える変更があったか」を `boolean` で返します（キャッシュ再検証の判断に使えます）。
- 引数に実行時刻（`Temporal.Instant`）を渡すと、その実行で書き込む行のタイムスタンプが揃います。省略時は現在時刻です。

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

## プロバイダーを追加する

1. `Scraper` を継承したクラスを作り、5 つの操作を実装します。プラットフォーム固有の紐づけテーブルへの書き込みもここに書きます。
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
