# Shared Tailwind CSS Configuration

このパッケージには、SHINJU DATE プロジェクト全体で共有される Tailwind CSS テーマ設定が含まれています。

## 内容

- **theme.css**: 共通のカラーパレットとテーマ変数定義
  - 774-nevy カラー（ブランドカラー / プライマリ）
  - 774-pink カラー（セカンダリカラー）
  - 774-blue カラー（セカンダリカラー）
  - プライマリー/セカンダリーカラー定義

## 使用方法

各アプリケーションの `globals.css` でインポートします：

```css
@import 'tailwindcss';
@import '@shinju-date/tailwind-config/theme.css';
```

これにより、すべてのアプリケーションとパッケージで一貫したカラーパレットを使用できます。

## カラーパレット

### ブランドカラー（774-nevy）

プライマリカラーとして使用します。ブランドの識別に重要な色です。

```css
--color-774-nevy-50: #f2f1ff;   /* 非常に薄い背景 */
--color-774-nevy-100: #eae5ff;  /* 薄い背景 */
--color-774-nevy-200: #d5ceff;  /* ボーダー */
--color-774-nevy-300: #b7a7ff;  /* 無効状態 */
--color-774-nevy-400: #9676ff;  /* ホバー効果 */
--color-774-nevy-500: #763fff;  /* 標準 */
--color-774-nevy-600: #6718ff;  /* テキスト、強調 */
--color-774-nevy-700: #5907fa;  /* 濃いテキスト */
--color-774-nevy-800: #4a05d2;  /* ホバー */
--color-774-nevy-900: #3e06ac;  /* 押下状態 */
--color-774-nevy-950: #1e0064;  /* プライマリ（最も濃い） */

/* エイリアス */
--color-primary: var(--color-774-nevy-950);
--color-primary-foreground: var(--color-774-nevy-50);
```

**使用例:**

```tsx
// ダッシュボードウィジェット
<div className="bg-774-nevy-50 p-4 hover:bg-774-nevy-100">
  <p className="text-774-nevy-600">統計情報</p>
</div>

// プライマリカラーのエイリアス
<div className="bg-primary text-primary-foreground">
  ヘッダー
</div>
```

### セカンダリカラー（774-pink）

アクセント、エラー表示、セカンダリボタンに使用します。

```css
--color-774-pink-50: #fff0f4;   /* 薄い背景 */
--color-774-pink-100: #ffe2ea;  /* 背景 */
--color-774-pink-200: #ffcada;  /* ボーダー */
--color-774-pink-300: #ff9fbb;  /* 無効状態 */
--color-774-pink-400: #ff6999;  /* ホバー */
--color-774-pink-500: #ff3278;  /* セカンダリ標準 */
--color-774-pink-600: #ed1166;  /* 強調 */
--color-774-pink-700: #c80858;  /* ホバー */
--color-774-pink-800: #a80950;  /* 押下 */
--color-774-pink-900: #8f0c4a;  /* 濃い */
--color-774-pink-950: #500124;  /* 最も濃い */

/* エイリアス */
--color-secondary-pink: var(--color-774-pink-500);
--color-secondary-pink-foreground: var(--color-774-pink-50);
```

**使用例:**

```tsx
// エラーメッセージ
<div className="bg-secondary-pink text-secondary-pink-foreground p-2">
  エラーが発生しました
</div>

// セカンダリボタン
<button className="bg-secondary-pink text-white hover:bg-774-pink-600">
  キャンセル
</button>
```

### セカンダリカラー（774-blue）

情報表示、リンク、プライマリボタンに使用します。

```css
--color-774-blue-50: #edf7ff;   /* 非常に薄い背景 */
--color-774-blue-100: #d6ebff;  /* 薄い背景 */
--color-774-blue-200: #b5deff;  /* ボーダー */
--color-774-blue-300: #83caff;  /* 無効状態 */
--color-774-blue-400: #48acff;  /* 無効ボタン */
--color-774-blue-500: #1e87ff;  /* 標準 */
--color-774-blue-600: #0665ff;  /* リンク、テキスト */
--color-774-blue-700: #0050ff;  /* セカンダリ標準 */
--color-774-blue-800: #083ec5;  /* ホバー */
--color-774-blue-900: #0d399b;  /* 押下 */
--color-774-blue-950: #0e245d;  /* 最も濃い */

/* エイリアス */
--color-secondary-blue: var(--color-774-blue-700);
--color-secondary-blue-foreground: var(--color-774-blue-50);
```

**使用例:**

```tsx
// リンク
<Link className="text-774-blue-600 hover:text-774-blue-800" href="/page">
  詳細を見る
</Link>

// プライマリボタン
<button className="bg-secondary-blue text-white hover:bg-774-blue-800">
  送信
</button>

// 情報ウィジェット
<div className="bg-774-blue-50 border-774-blue-300 p-4">
  <p className="text-774-blue-600">お知らせ</p>
</div>
```

## カラー使用のベストプラクティス

### 1. テーマカラーを優先

一般的な Tailwind カラー（`blue-*`, `purple-*`, `indigo-*`, `pink-*`）の代わりに、必ずテーマカラーを使用してください。

❌ 避けるべき:
```tsx
<div className="bg-blue-600">ボタン</div>
<p className="text-purple-600">テキスト</p>
```

✅ 推奨:
```tsx
<div className="bg-secondary-blue">ボタン</div>
<p className="text-774-nevy-600">テキスト</p>
```

### 2. セマンティックカラーの使用

成功・エラー・警告などの状態表示には、一般的なカラーを使用します。

```tsx
// ✅ 成功状態
<div className="bg-green-50 text-green-600">保存しました</div>

// ✅ エラー状態
<div className="bg-red-50 text-red-600">エラーが発生しました</div>

// ✅ 警告状態
<div className="bg-yellow-50 text-yellow-600">注意が必要です</div>
```

### 3. コントラスト比の確保

アクセシビリティのため、十分なコントラスト比を確保してください。

```tsx
// ✅ 良いコントラスト
<div className="bg-774-blue-50">
  <p className="text-774-blue-700">読みやすいテキスト</p>
</div>

// ❌ 悪いコントラスト
<div className="bg-774-blue-100">
  <p className="text-774-blue-200">読みにくいテキスト</p>
</div>
```

### 4. ホバー・フォーカス状態の定義

インタラクティブな要素には、適切なホバー・フォーカス状態を定義してください。

```tsx
// ✅ 適切な状態管理
<button className="bg-secondary-blue hover:bg-774-blue-800 active:bg-774-blue-600 focus:ring-2 focus:ring-774-blue-500">
  クリック
</button>

<Link className="text-774-blue-600 hover:text-774-blue-800 underline-offset-4 hover:underline">
  リンク
</Link>
```

## UIコンポーネントでの使用例

### Button コンポーネント

```tsx
<Button variant="primary">プライマリボタン</Button>
<Button variant="secondary-blue">セカンダリブルー</Button>
<Button variant="secondary-pink">セカンダリピンク</Button>
<Button variant="danger">危険な操作</Button>
```

### Badge コンポーネント

```tsx
<Badge variant="info">情報</Badge>
<Badge variant="success">成功</Badge>
<Badge variant="error">エラー</Badge>
<Badge variant="warning">警告</Badge>
```

## トラブルシューティング

### カラーが反映されない

1. `globals.css` で `theme.css` をインポートしているか確認
2. Tailwind CSS のビルドが最新か確認（`pnpm run build` を実行）
3. ブラウザのキャッシュをクリア

### 独自のカラー定義が必要な場合

やむを得ず独自のカラーが必要な場合は、必ず理由をコメントで明記してください。

```tsx
// ✅ 理由を明記
<div className="bg-orange-500"> {/* YouTube のブランドカラー */}
  YouTube
</div>
```

## 参考資料

- [Tailwind CSS - Customizing Colors](https://tailwindcss.com/docs/customizing-colors)
- [WCAG 2.1 - Contrast Ratio](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [プロジェクトのコーディングガイドライン](../../docs/coding-guidelines.md#カラーパレットの使用)
