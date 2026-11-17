# @shinju-date/instrumentation

`apps/web`、`apps/admin`、`apps/batch` の Sentry と MSW の初期化をまとめたパッケージ。

## 構成

入口を3つに分けています。ブラウザ向けの出力に、サーバー用のコード（`@sentry/profiling-node` や MSW）が入らないようにするためです。

| 入口                                       | エクスポート                              | 呼ぶ場所                    |
| ------------------------------------------ | ----------------------------------------- | --------------------------- |
| `@shinju-date/instrumentation/server`      | `registerServer()`、`onRequestError`      | `instrumentation.ts`        |
| `@shinju-date/instrumentation/client`      | `initClient()`、`onRouterTransitionStart` | `instrumentation-client.ts` |
| `@shinju-date/instrumentation/next-config` | `withSentry()`                            | `next.config.ts`            |

`NEXT_PUBLIC_SENTRY_DSN` がなければ、Sentry は初期化せず、`withSentry()` は設定をそのまま返します。`VERCEL_ENV`（ブラウザでは `NEXT_PUBLIC_VERCEL_ENV` も）が `production` のときだけ、Sentry に送信します。

`@sentry/nextjs`、`@sentry/profiling-node`、`@supabase/sentry-js-integration`、`@supabase/supabase-js` は `peerDependencies` です。アプリが持つ1つの版を使います。

## 使用方法

### `instrumentation.ts`

```typescript
import { registerServer } from '@shinju-date/instrumentation/server'

export { onRequestError } from '@shinju-date/instrumentation/server'

export async function register() {
  const { serverEnv } = await import('./lib/env')

  await registerServer({
    enableMsw: serverEnv.ENABLE_MSW,
    profileSessionSampleRate: 1.0,
    tracesSampleRate: 1.0,
  })
}
```

`enableMsw` が `true` なら、Node.js のランタイムで MSW のサーバーを起動します（[MSWガイド](../../docs/msw-guide.md)）。

### `instrumentation-client.ts`

```typescript
import { initClient } from '@shinju-date/instrumentation/client'

export { onRouterTransitionStart } from '@shinju-date/instrumentation/client'

initClient({
  profileSessionSampleRate: 1.0,
  replay: {
    onErrorSampleRate: 1.0,
    sessionSampleRate: 0.1,
  },
  tracesSampleRate: 1.0,
})
```

`@sentry/nextjs` の読み込みや初期化に失敗したときは、コンソールにログを出します。Sentry 以外の処理（Temporal のポリフィルの読み込みなど）は、アプリの `instrumentation-client.ts` に書きます。

### `next.config.ts`

```typescript
import { withSentry } from '@shinju-date/instrumentation/next-config'

export default withSentry(nextConfig)
```

ほかのプラグイン（`withMDX` など）を使うときは、`withSentry()` を最後に適用します。

## テスト

```bash
pnpm run test
```

## 開発

```bash
# ビルド
pnpm run build
```
