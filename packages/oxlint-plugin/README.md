# @shinju-date/oxlint-plugin

oxlint の組み込みのルールで確かめられない、このプロジェクトの決まりを確かめる oxlint の JS プラグイン。ルートの [`oxlint.config.ts`](../../oxlint.config.ts) が `jsPlugins` で読み込み、ルールを有効にする。

ビルドせず、TypeScript のまま Node.js が読み込む（型の除去）。そのため、相対パスの import には `.ts` を付け、型だけを読み込むときは `import type` を使う。

## ルール

| ルール | 確かめること |
| --- | --- |
| [`shinju-date/cache-directive-blank-line`](src/cache-directive-blank-line.ts) | `'use cache'` と、`cacheLife()` / `cacheTag()` の並びの後に空行を入れる（自動修正あり。[キャッシュのディレクティブ](../../docs/coding-guidelines.md#キャッシュのディレクティブ)） |
| [`shinju-date/no-hardcoded-time-zone`](src/no-hardcoded-time-zone.ts) | `'Asia/Tokyo'` を直接書かず、`@shinju-date/constants` の `TIME_ZONE` を使う（[時刻の扱い](../../docs/coding-guidelines.md#時刻の扱い)） |
| [`shinju-date/no-default-tailwind-scale`](src/no-default-tailwind-scale.ts) | Tailwind の既定の文字サイズ・角丸・影と `dark:` を使わない（[デザインのガイドライン](../../docs/design-guidelines.md)） |

対象から外すファイル（テスト、`TIME_ZONE` の定義、`theme.css` を登録する `twMerge` など）は、ルールではなく `oxlint.config.ts` の `overrides` で決める。

## 開発

```bash
# テスト（ルールのテストと、oxlint.config.ts の設定のテスト）
pnpm run test

# 型チェック
pnpm run typecheck
```

- [`src/fixtures.ts`](src/fixtures.ts) のフィクスチャは、`// report` で終わる行が報告され、ほかの行は報告されないことを確かめる
- [`src/config.test.ts`](src/config.test.ts) は、アプリとパッケージに一時的なフィクスチャを書き、oxlint を実行して、各ワークスペースでルートの決まりが効くことと、対象外のファイルで報告しないことを確かめる
