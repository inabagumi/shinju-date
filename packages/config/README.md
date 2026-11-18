# @shinju-date/config

`packages/*` と `apps/*` が共有する、ビルドとテストの設定です。ビルドのない、設定だけのパッケージです。

## TypeScript

`tsconfig/` に、`tsconfig.json` の基底を置いています。各パッケージとアプリの `tsconfig.json` は、どれか1つを継承します。

| ファイル | 使う場所 | 中身 |
| --- | --- | --- |
| [`tsconfig/node-library.json`](tsconfig/node-library.json) | Node だけで動くパッケージ | `@tsconfig/strictest`、`target` は `ES2025`、`lib` は `ES2025` と `ESNext.Array`、`ESNext.Temporal`（`DOM` なし）、`module` は `Node20`、`moduleResolution` は `Node16`、`types` は `node` |
| [`tsconfig/universal-library.json`](tsconfig/universal-library.json) | ブラウザでも動くパッケージ | `node-library.json` の `lib` に、`DOM` と `DOM.Iterable` を足したもの |
| [`tsconfig/react-library.json`](tsconfig/react-library.json) | React の部品のパッケージ（`ui`） | `universal-library.json` に、JSX（`react-jsx`）を足し、`module` を `Preserve`、`moduleResolution` を `Bundler` にしたもの |
| [`tsconfig/next-app.json`](tsconfig/next-app.json) | `apps/*` | `@tsconfig/strictest` と `@tsconfig/next`。`target`、`lib`、`module`、`moduleResolution` は `universal-library.json` と `react-library.json` と同じ |

パッケージの `tsconfig.json` は、基底を継承し、`include` だけを書きます。`include` と `paths` は、書いたファイルからの相対パスになるため、基底には書けません。

```json
{
  "extends": "@shinju-date/config/tsconfig/node-library.json",
  "include": ["./src/**/*.ts", "./tsdown.config.ts"]
}
```

アプリの `tsconfig.json` は、`include` に加えて、`@/*` の `paths` を書きます。基底と違う値が要るときは、理由をコメントで書いてください。

### 基底の選び方

ブラウザで動くか、つまり、`apps/web` と `apps/admin` のクライアントコンポーネント（`instrumentation-client.ts` を含む）から、値を import されるかで選びます。型だけの import（`import type`）は数えません。

- `universal-library.json`: `constants`、`database`（`Constants`）、`helpers`、`instrumentation`（`client`）、`temporal-fns`
- `react-library.json`: `ui`
- `node-library.json`: そのほかのパッケージと、このパッケージ

Node だけで動くパッケージで、`window` や `document` などのブラウザの API を書くと、型エラーになります。クライアントコンポーネントから、Node だけで動くパッケージを import するようになったら、基底を `universal-library.json` に変えてください。

### `target`、`lib`、`module`

TypeScript を更新したときに意味が変わらないように、`ESNext` や `NodeNext` のような、TypeScript のバージョンで中身が変わる値は使いません。

- `target` と `lib` は、ECMAScript の版（`ES2025`）にします。まだ版に入っていない機能は、`ESNext.Array`（`Array.fromAsync`）や `ESNext.Temporal`（`Temporal`）のように、機能ごとに `lib` に足します。新しい版が出たら、版を上げ、版に入った `ESNext.*` を外します
- `module` は、Node で動くパッケージは `Node20`、バンドラーを通すもの（`ui` とアプリ）は `Preserve` にします。`moduleResolution` には `Node20` がないため、`Node16` にします（`Node20` の `module` と組み合わせられます）

`tsc` は型を確かめるだけで、ファイルを出力しません（`noEmit`）。出力する構文は、パッケージでは tsdown の `target`（[tsdown](#tsdown)）、アプリでは Next.js が決めます。

TypeScript 6 は、`types` を書かないと `@types/*` を読み込まないため、基底に `types: ["node"]` を書いています。各パッケージは、`@types/node` を `devDependencies` に入れてください。

## tsdown

`definePackageConfig()` は、共通の設定に、入口（`entry`）と上書きを足した、tsdown の設定を返します。

```ts
// packages/<name>/tsdown.config.ts
import { definePackageConfig } from "@shinju-date/config/tsdown";

export default definePackageConfig({
  entry: ["./src/index.ts"],
});
```

共通の設定は次のとおりです（[`tsdown.ts`](tsdown.ts)）。

| 設定             | 値                                     |
| ---------------- | -------------------------------------- |
| `dts`            | `true`                                 |
| `fixedExtension` | `false`（`.js` と `.d.ts` を出力する） |
| `format`         | `'esm'`                                |
| `sourcemap`      | `true`                                 |
| `target`         | `'es2022'`                             |

共通の設定と違う値を渡すときは、理由をコメントで書いてください（`packages/ui/tsdown.config.ts` の `unbundle` など）。

## Vitest

`defineVitestConfig()` は、共通の設定に上書きを足した、Vitest の設定を返します。Node で動くパッケージは、引数なしで呼びます。

```ts
// packages/<name>/vitest.config.ts
import { defineVitestConfig } from "@shinju-date/config/vitest";

export default defineVitestConfig();
```

React の部品をテストするパッケージ（`ui`）とアプリ（`web`、`admin`）は、`defineVitestConfig.react()` を呼びます。`@vitejs/plugin-react`（JSX の変換）と jsdom を足した設定を返します。

```ts
// apps/<name>/vitest.config.ts
import { defineVitestConfig } from "@shinju-date/config/vitest";

export default defineVitestConfig.react({
  test: {
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

共通の設定は次のとおりです（[`vitest.ts`](vitest.ts)）。

| 設定               | `defineVitestConfig()` | `defineVitestConfig.react()` |
| ------------------ | ---------------------- | ---------------------------- |
| `plugins`          | なし                   | `@vitejs/plugin-react`       |
| `test.environment` | `'node'`               | `'jsdom'`                    |

`globals` は使いません。テストは、`describe`、`expect`、`vi` などを、`vitest` から import します。Testing Library は、`afterEach` がグローバルにないと、テストのあとに部品をアンマウントしないため、React の部品をテストするプロジェクトは、`vitest.setup.ts` で `cleanup()` を呼びます（`packages/ui/vitest.setup.ts` など）。

上書きは Vitest の `mergeConfig()` で足すため、配列（`plugins`、`setupFiles` など）は共通の設定に追加されます。

## Playwright

`definePlaywrightConfig()` は、`apps/*` の E2E テストの設定を返します。アプリごとに違う、ポート（`port`）、そのアプリだけの環境変数（`env`）、起動を待つパス（`readyPath`、既定は `/`）を渡します。

```ts
// apps/<name>/playwright.config.ts
import { definePlaywrightConfig } from "@shinju-date/config/playwright";

export default definePlaywrightConfig({
  env: {
    GOOGLE_API_KEY: "fake",
  },
  port: 5000,
  readyPath: "/api/healthz",
});
```

共通の設定は次のとおりです（[`playwright.ts`](playwright.ts)）。`CI` を設定したときは、括弧の中の値になります。

| 設定 | 値 |
| --- | --- |
| `testDir` / `testMatch` | `./e2e` / `**/*.spec.ts` |
| `projects` | `chromium`（Desktop Chrome） |
| `retries` | `0`（`2`） |
| `workers` | Playwright の既定（`1`） |
| `reporter` | `html`（`github` と `html`） |
| `forbidOnly` | `false`（`true`） |
| `use.baseURL` | `http://localhost:<port>` |
| `use.trace` | `'on-first-retry'` |
| `webServer.command` | `pnpm dev`（`playwright.config.ts` のあるフォルダーで起動する） |
| `webServer.env` | `ENABLE_MSW`、`NEXT_PUBLIC_BASE_URL`、`NEXT_TELEMETRY_DISABLED`、Supabase と Upstash の偽の値 |
| `webServer.reuseExistingServer` | `true`（`false`） |
| `webServer.url` | `http://localhost:<port><readyPath>` |

`projects` などの、Playwright のほかの設定も渡せます。アプリに必要なときだけ渡してください（`apps/admin/playwright.config.ts` の、ログインを済ませるプロジェクトなど）。

## `package.json` の `exports`

ビルドするパッケージの `exports` は、すべて次の形にします。`main`、`types`、`typesVersions` は書きません。

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

- 各入口は、`types` と `default` の2つの条件だけを持ち、`types` を先に書きます（TypeScript は条件を上から順に見るため）
- CSS などの JavaScript ではないファイルは、条件を付けずにパスだけを書きます（`"./theme.css": "./theme.css"`）

CI の `pnpm run check:package-exports`（`scripts/check-package-exports.mjs`）が、ビルドのあとに、この形と、指しているファイルが存在することを確かめます。
