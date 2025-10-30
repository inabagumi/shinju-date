# Shared UI Components for SHINJU DATE

このパッケージには SHINJU DATE アプリケーション全体で共有されるUIコンポーネントが含まれています。

## コンポーネント

### Button

複数のバリエーションを持つ汎用ボタンコンポーネント。

**バリアント:**
- `primary` (デフォルト): 青色のプライマリーボタン
- `secondary`: グレーのセカンダリーボタン
- `danger`: 赤色の危険なアクションを示すボタン
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
- `error`: エラー状態の入力フィールド

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
  variant="error"
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

<Dialog>
  <DialogTrigger asChild>
    <Button>ダイアログを開く</Button>
  </DialogTrigger>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent>
      <DialogTitle>タイトル</DialogTitle>
      <DialogDescription>
        これはダイアログの説明文です。
      </DialogDescription>
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
- `default` (デフォルト): グレー背景のカード
- `elevated`: 白背景で影付きのカード
- `outlined`: 背景色なしでボーダーのみのカード

**サブコンポーネント:**
- `CardHeader`: カードのヘッダー部分
- `CardContent`: カードのメインコンテンツ
- `CardFooter`: カードのフッター部分

```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@shinju-date/ui'

<Card variant="elevated">
  <CardHeader>
    <h2>カードタイトル</h2>
  </CardHeader>
  <CardContent>
    <p>カードの内容がここに入ります。</p>
  </CardContent>
  <CardFooter>
    <Button>アクション</Button>
  </CardFooter>
</Card>
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

# 開発モード（watch）
pnpm run dev
```

## CVAによるバリアント管理

このパッケージでは `class-variance-authority` (CVA) を使用して、各コンポーネントのバリアントとサイズを管理しています。これにより、アプリケーションごとの細かなスタイルの違いに柔軟に対応できます。

```typescript
// 例: Buttonコンポーネントのバリアント定義
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'border border-gray-300 bg-white text-gray-700',
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
