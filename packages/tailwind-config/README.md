# Shared Tailwind CSS Configuration

このパッケージには、SHINJU DATE プロジェクト全体で共有される Tailwind CSS テーマ設定が含まれています。

## 内容

- **theme.css**: 共通のカラーパレットとテーマ変数定義
  - 色見本（`774-nevy-*` / `774-pink-*` / `774-blue-*`）
  - セマンティックカラー（`primary` / `background` / `foreground` / `accent` など）
  - フォント（`font-sans`）、文字サイズ（`text-display` / `text-title` / `text-heading` / `text-body` / `text-meta` / `text-caption`）、文章の最大幅（`max-w-text`）

色・文字・角丸・影の使い分けは [docs/design-guidelines.md](../../docs/design-guidelines.md) を参照してください。

## 使用方法

各アプリケーションの `globals.css` でインポートします：

```css
@import 'tailwindcss';
@import '@shinju-date/tailwind-config/theme.css';
```

これにより、すべてのアプリケーションとパッケージで一貫したカラーパレットを使用できます。

## セマンティックカラー

部品の色には、用途で名付けたセマンティックカラーを使います。色の一覧・用途・ライトとダークの値は
[`theme.css`](./theme.css) を参照してください（Storybook の「Design System/Colors」で見本も確認できます）。

`background` などは `prefers-color-scheme` でライトとダークの値が切り替わるため、1つのクラスを
書くだけで両モードに対応できます（`dark:` は書きません）。

```tsx
const example = (
  <div className="border border-border bg-surface text-foreground">
    <p className="text-muted">補助情報</p>
    <button className="bg-accent text-accent-foreground" type="button">
      保存
    </button>
  </div>
)
```

ダークモードに対応していないアプリは `<html data-color-scheme="light">` を指定すると、
OS の設定にかかわらずライトの値に固定できます。

文字と地のコントラスト比は `packages/ui/src/colors.test.ts` で確認しています。

## 文字サイズ

文字サイズは、サイズと行間を組にした6段階のクラスで指定します。値は [`theme.css`](./theme.css)、
役割ごとの太さとの組み合わせは [docs/design-guidelines.md](../../docs/design-guidelines.md#文字) を参照してください。

```tsx
const example = (
  <div>
    <h2 className="text-heading font-bold">セクション見出し</h2>
    <p className="text-body">本文</p>
    <p className="text-meta text-muted tabular-nums">2026/11/14 21:00</p>
  </div>
)
```

クラスを結合するときは、`@shinju-date/ui` の `twMerge` を使います。`tailwind-merge` の `twMerge` は
`text-body` などを文字色として扱い、`text-foreground` などと一緒に書くと消してしまうためです。
文字サイズを追加したときは、`packages/ui/src/tw-merge.ts` の一覧にも追加してください
（`packages/ui/src/tw-merge.test.ts` で `theme.css` と一致しているかを確認しています）。

## 色見本

`theme.css` は、ブランドの色見本として、`774-nevy-*`（紫）、`774-pink-*`（ピンク）、`774-blue-*`（青）を、それぞれ 50〜950 の11段階で定義しています。セマンティックカラーは、これらの色見本や Tailwind の標準色を `var()` で参照して作っています。

部品では色見本を直接使わず、[セマンティックカラー](#セマンティックカラー)を使います。色の決まりは、[docs/design-guidelines.md の「色」](../../docs/design-guidelines.md#色)にまとめています。

## UIコンポーネントでの使用例

### Button コンポーネント

```tsx
<Button variant="primary">プライマリボタン</Button>
<Button variant="danger">危険な操作</Button>
```

### Badge コンポーネント

```tsx
<Badge variant="info">情報</Badge>
<Badge variant="success">成功</Badge>
<Badge variant="danger">危険</Badge>
<Badge variant="warning">警告</Badge>
```

## トラブルシューティング

### カラーが反映されない

1. `globals.css` で `theme.css` をインポートしているか確認
2. アプリの開発サーバーを再起動するか、アプリをビルドし直す（`pnpm run build --filter=<アプリ名>`）
3. ブラウザのキャッシュをクリア

## 参考資料

- [Tailwind CSS - Customizing Colors](https://tailwindcss.com/docs/customizing-colors)
- [WCAG 2.1 - Contrast Ratio](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [プロジェクトのデザインガイドライン](../../docs/design-guidelines.md#色)
