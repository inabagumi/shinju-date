# Shared UI Components for SHINJU DATE

このパッケージには SHINJU DATE アプリケーション全体で共有されるUIコンポーネントが含まれています。

## Storybook

UIコンポーネントのインタラクティブなドキュメントと開発環境として、Storybookを導入しています。

### Storybookの起動

```bash
# 開発サーバーを起動
pnpm storybook

# ブラウザで http://localhost:6006 を開く
```

### Storybookのビルド

```bash
# 本番用の静的ファイルを生成
pnpm build-storybook

# 出力先: storybook-static/
```

### Storybookで確認できる内容

- すべてのUIコンポーネントのバリエーション
- 各コンポーネントのProps一覧と説明
- インタラクティブなコントロールでのプロパティ変更
- 使用例とコードスニペット
- ダークモード対応の確認

## コンポーネント

主な部品を説明します。ほかに、`Alert`、`MultiSelect`、`Toast`（`ToastProvider` など）と、`theme.css` の文字サイズを登録した `twMerge` も公開しています。公開しているものは [`src/index.ts`](src/index.ts) と Storybook を見てください。

### Button

複数のバリエーションを持つ汎用ボタンコンポーネント。

**バリアント:**

- `primary` (デフォルト): アクセントカラー（`bg-accent`）の主ボタン
- `secondary`: 枠線付き（`bg-surface`）のボタン
- `danger`: 危険な操作を示す、`danger` の枠線と文字のボタン
- `ghost`: 背景色なしのゴーストボタン

**サイズ:**

- `sm`: 小サイズ (px-3 py-1)
- `md` (デフォルト): 中サイズ (px-4 py-2)
- `lg`: 大サイズ (px-6 py-3)

**Props:**

- `asChild`: `true`の場合、子要素にスタイルを適用 (Radix UI Slot パターン)

```tsx
import { Button } from '@shinju-date/ui'

// 基本的な使用
<Button variant="primary" size="md">送信</Button>

// Linkコンポーネントと組み合わせる
<Button asChild variant="secondary">
  <Link href="/home">ホームへ</Link>
</Button>
```

### Input

一貫したスタイルを持つフォーム入力コンポーネント。

**バリアント:**

- `default` (デフォルト): 通常の入力フィールド
- `danger`: エラー状態の入力フィールド

**サイズ:**

- `sm`: 小サイズ
- `md` (デフォルト): 中サイズ
- `lg`: 大サイズ

**注意**: `size` プロップ名はHTML input要素のネイティブ属性と競合するため、`inputSize` を使用します。

```tsx
import { Input } from '@shinju-date/ui'

<Input 
  placeholder="テキストを入力..." 
  variant="default"
  inputSize="md"
/>

<Input 
  placeholder="エラー状態" 
  variant="danger"
/>
```

### Dialog

Radix UIを基盤としたモーダルダイアログコンポーネント。

**コンポーネント:**

- `Dialog`: ルートコンポーネント
- `DialogTrigger`: トリガーボタン
- `DialogPortal`: ポータル
- `DialogOverlay`: 背景オーバーレイ
- `DialogContent`: ダイアログの内容
- `DialogTitle`: タイトル
- `DialogDescription`: 説明文
- `DialogClose`: 閉じるボタン

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  Button,
} from '@shinju-date/ui'

;<Dialog>
  <DialogTrigger asChild>
    <Button>ダイアログを開く</Button>
  </DialogTrigger>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent>
      <DialogTitle>タイトル</DialogTitle>
      <DialogDescription>これはダイアログの説明文です。</DialogDescription>
      <DialogClose asChild>
        <Button variant="secondary">閉じる</Button>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</Dialog>
```

### Card

コンテンツ用のコンテナコンポーネント。

**バリアント:**

- `default` (デフォルト): `bg-muted` の地のカード
- `elevated`: `bg-surface` の地のカード（影は付けない）

**サブコンポーネント:**

- `CardHeader`: カードのヘッダー部分
- `CardContent`: カードのメインコンテンツ

```tsx
import { Card, CardHeader, CardContent } from '@shinju-date/ui'

;<Card variant="elevated">
  <CardHeader>
    <h2>カードタイトル</h2>
  </CardHeader>
  <CardContent>
    <p>カードの内容がここに入ります。</p>
  </CardContent>
</Card>
```

### Badge

状態を示す小さなラベル。色は状態の意味で選びます。

- `info` (デフォルト): 情報（アクセントカラー）
- `success`: 成功（公開中・完了など）
- `warning`: 注意（未読・中断など）
- `danger`: 危険（失敗・削除済みなど）
- `neutral`: 中立（終了・非表示など）

```tsx
import { Badge } from '@shinju-date/ui'

;<Badge variant="success">公開中</Badge>
```

### PageHeader

ページの見出し。見出し（24px・太字）、説明（任意）、右端の操作ボタン（任意）を並べ、下に 24px の余白を取ります。

```tsx
import { Button, PageHeader } from '@shinju-date/ui'

;<PageHeader
  actions={<Button>タレントを追加</Button>}
  description="登録されているタレントの一覧です。"
  title="タレント管理"
/>
```

### Table

表。外枠は `border` と角丸で、見出し行は `bg-muted` の地に 12px（`text-caption`）・`font-semibold`・`text-muted` の文字です。セルは既定で折り返さず、はみ出す場合は表の中で横にスクロールします。

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'

;<Table>
  <TableHeader>
    <TableRow>
      <TableHead>タイトル</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>動画のタイトル</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Select

セレクトボックス。`Input` と同じ高さ・枠・角丸・フォーカス表示で、`variant` と `inputSize` も同じものを使えます。右端の矢印は `text-muted` で描くため、`<select>` を入れ物で囲んでいます。`className` は入れ物に付くので、幅や余白などの配置を指定してください。

```tsx
import { Select } from '@shinju-date/ui'

;<Select aria-label="並び順" defaultValue="new">
  <option value="new">新しい順</option>
  <option value="old">古い順</option>
</Select>
```

### Textarea

複数行の入力欄。`Input` と同じ余白・枠・角丸・フォーカス表示で、`variant` と `inputSize` も同じものを使えます。

```tsx
import { Textarea } from '@shinju-date/ui'

;<Textarea placeholder="内容を入力..." rows={4} variant="danger" />
```

### EmptyState

データがないことを伝える表示。アイコン（任意）、1行の見出し、補足（任意）、操作ボタン（任意）を中央に並べます。高さは内容なりです。

```tsx
import { EmptyState } from '@shinju-date/ui'
import { Inbox } from 'lucide-react'

;<EmptyState icon={<Inbox />} title="お知らせはまだありません" />
```

### StatTile

統計のタイル。ラベル、値、前日比（任意）を並べます。色は前日比に意味があるときだけ `changeTone` で付けます（良い変化は `positive`、悪い変化は `negative`）。

```tsx
import { StatTile } from '@shinju-date/ui'

;<StatTile
  change="+3（前日比）"
  changeTone="negative"
  label="取り込みの失敗"
  value="5"
/>
```

### FilterBar

絞り込みを横に並べる入れ物。狭い画面ではボタンの中に折りたたみ、`activeCount` に渡した適用中の件数を表示します。サーバーコンポーネントからも使えます。

```tsx
import { FilterBar, Input, Select } from '@shinju-date/ui'

;<FilterBar activeCount={1}>
  <Input aria-label="キーワード" placeholder="キーワード" />
  <Select aria-label="公開状態">
    <option value="">すべて</option>
    <option value="visible">公開中</option>
  </Select>
</FilterBar>
```

## 技術スタック

- **React 19**: UIライブラリ
- **TypeScript**: 型安全性
- **Tailwind CSS v4**: スタイリング
- **class-variance-authority**: バリアント管理
- **Radix UI**: アクセシブルなプリミティブ

## 開発

```bash
# パッケージのビルド
pnpm run build
```

### ビルドの出力

`dist/` には、`src/` のファイルを1つずつ変換したモジュールを置きます（tsdown の `unbundle: true`）。アプリが `@shinju-date/ui` から読み込んでも、使う部品のモジュールとその Radix のパッケージだけがブラウザに配信されます。`package.json` の `"sideEffects"` で、CSS 以外のモジュールに副作用がないことを示しています。

部品を追加・変更するときは、次を守ってください。

- 相対パスのインポートには拡張子 `.js` を付ける（例: `import { twMerge } from '../tw-merge.js'`）。1ファイルずつ変換するため、拡張子がないとアプリから読み込めない
- 読み込み時に処理を実行するコード（グローバルな値の書き換えなど）を書かない
- `useState` や `useEffect` などのフック、部品の中で定義したイベントハンドラーを使う部品は、ファイルの先頭に `'use client'` を書く（出力にもそのまま残る）
- 新しい部品は `src/index.ts` から書き出す

## CVAによるバリアント管理

このパッケージでは `class-variance-authority` (CVA) を使用して、各コンポーネントのバリアントとサイズを管理しています。これにより、アプリケーションごとの細かなスタイルの違いに柔軟に対応できます。

```typescript
// 例: Buttonコンポーネントのバリアント定義
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-control font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-foreground hover:bg-accent/90',
        secondary:
          'border border-border bg-surface text-foreground hover:bg-muted',
        // ...
      },
      size: {
        sm: 'px-3 py-1 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
      },
    },
  },
)
```
