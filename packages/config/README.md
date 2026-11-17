# @shinju-date/config

`packages/*` が共有する、ビルドの設定です。ビルドのない、設定だけのパッケージです。

## tsdown

`definePackageConfig()` は、共通の設定に、入口（`entry`）と上書きを足した、tsdown の設定を返します。

```ts
// packages/<name>/tsdown.config.ts
import { definePackageConfig } from '@shinju-date/config/tsdown'

export default definePackageConfig({
  entry: ['./src/index.ts'],
})
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
