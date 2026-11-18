# @shinju-date/retryable-fetch

一時的な失敗を再試行する `fetch`。

## 使い方

```typescript
import retryableFetch from "@shinju-date/retryable-fetch";

const response = await retryableFetch("https://api.example.com/data");

if (!response.ok) {
  throw new Error(`Request failed with ${response.status}`);
}
```

## 動作

- 通信の失敗と `408` / `429` / `5xx` を、最大5回再試行する（間隔は [p-retry](https://github.com/sindresorhus/p-retry) の既定）
- `GET` / `HEAD` 以外は再試行しない
- 応答は、`4xx` や最後の `5xx` も含めてそのまま返す。`response.ok` は呼び出し元で確かめる
- `signal` が中断されたら再試行をやめる

## 開発

```bash
pnpm run build
pnpm run test
```
