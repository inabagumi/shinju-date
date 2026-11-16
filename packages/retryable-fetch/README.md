# @shinju-date/retryable-fetch

再試行で直る見込みのある失敗だけを再試行する `fetch` を提供するパッケージ。

## 使い方

既定のエクスポートの `retryableFetch` を、`fetch` と同じ引数で呼びます。

```typescript
import retryableFetch from '@shinju-date/retryable-fetch'

const response = await retryableFetch('https://api.example.com/data')

if (!response.ok) {
  throw new Error(`Request failed with ${response.status}`)
}
```

Supabase クライアントの `fetch` にも、そのまま渡せます。

```typescript
import retryableFetch from '@shinju-date/retryable-fetch'
import { createClient } from '@supabase/supabase-js'

const supabaseClient = createClient(url, key, {
  global: { fetch: retryableFetch },
})
```

## 動作

- 再試行するのは、`GET` と `HEAD` のリクエストだけです。ほかのメソッド（`POST` / `PATCH` / `DELETE` など）は、1回だけ送ります
- 再試行するのは、`fetch` そのものの失敗（通信の失敗など）と、`408` / `429` / `5xx` の応答だけです
- 再試行は最大5回で、間隔は [p-retry](https://github.com/sindresorhus/p-retry) の既定（1秒から倍々）です。再試行の回数と間隔は変えられません
- 応答を受け取れた場合は、`4xx` や最後の試行の `5xx` も、例外にせず `Response` を返します。呼び出し元で `response.ok` を確かめてください
- 最後の試行まで `fetch` が失敗した場合は、最後の例外を投げます
- `init.signal`（または `Request` の `signal`）が中断されたら、再試行をやめて、中断の理由で失敗します

## 開発

```bash
# ビルド
pnpm run build

# テスト
pnpm run test
```
