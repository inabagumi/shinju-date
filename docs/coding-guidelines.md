# コーディングガイドライン

このドキュメントでは、SHINJU DATEプロジェクトにおけるコーディング規約とベストプラクティスを定めます。

## TypeScript 型定義

### 基本方針: interface を優先

**原則として、オブジェクトの型定義には `interface` を使用してください。**

#### 理由

1. **拡張性**: `interface` は `extends` による拡張が可能で、将来的な型の拡張に対応しやすい
2. **宣言のマージ**: 同名の `interface` を複数回宣言すると自動的にマージされる
3. **クラスとの親和性**: `implements` でクラスに実装しやすい
4. **パフォーマンス**: TypeScriptコンパイラは `interface` の処理が高速
5. **エラーメッセージ**: 型エラー時のメッセージがわかりやすい

#### 使用例

##### ✅ 推奨: interface を使用

```typescript
// React コンポーネントのProps
interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

export function Button({ label, onClick, disabled }: ButtonProps) {
  // ...
}

// 関数のオプション
interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
}

async function fetchData(url: string, options?: FetchOptions) {
  // ...
}

// 拡張の例
interface BaseProps {
  id: string
  name: string
}

interface ExtendedProps extends BaseProps {
  description: string
}
```

##### ❌ 非推奨: type を使用しない

```typescript
// ❌ Props に type を使用
type ButtonProps = {
  label: string
  onClick: () => void
  disabled?: boolean
}

// ❌ オプションに type を使用
type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
}
```

### 例外: type を使用する場合

以下の場合に限り、`type` の使用を許可します：

#### 1. ユニオン型（Union Types）

```typescript
// ✅ ユニオン型は type を使用
type Status = 'pending' | 'approved' | 'rejected'
type Result = Success | Error
type ID = string | number
```

#### 2. インターセクション型（Intersection Types）

```typescript
// ✅ インターセクション型は type を使用
type WithTimestamps = {
  createdAt: Date
  updatedAt: Date
}

type User = {
  id: string
  name: string
}

type UserWithTimestamps = User & WithTimestamps
```

#### 3. マップド型（Mapped Types）

```typescript
// ✅ マップド型は type を使用
type Readonly<T> = {
  readonly [P in keyof T]: T[P]
}

type Partial<T> = {
  [P in keyof T]?: T[P]
}
```

#### 4. 条件型（Conditional Types）

```typescript
// ✅ 条件型は type を使用
type NonNullable<T> = T extends null | undefined ? never : T
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any
```

#### 5. タプル型（Tuple Types）

```typescript
// ✅ タプル型は type を使用
type Point = [number, number]
type RGB = [number, number, number]
```

#### 6. 関数型の単純な定義

```typescript
// ✅ 関数型の簡潔な定義は type を使用可能
type EventHandler = (event: Event) => void
type Predicate<T> = (value: T) => boolean

// ただし、interface でも定義可能
interface EventHandler {
  (event: Event): void
}
```

### 既存コードのリファクタリング

既存のコードで `type` を使用している箇所を `interface` に変更する際の手順：

1. **Props の変換**

   ```typescript
   // Before
   type MyComponentProps = {
     title: string
     children: React.ReactNode
   }

   // After
   interface MyComponentProps {
     title: string
     children: React.ReactNode
   }
   ```

2. **ComponentPropsWithoutRef との組み合わせ**

   ```typescript
   // Before
   type ButtonProps = ComponentPropsWithoutRef<'button'> & {
     variant?: 'primary' | 'secondary'
   }

   // After
   interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
     variant?: 'primary' | 'secondary'
   }
   ```

3. **Omit/Pick との組み合わせ**

   ```typescript
   // type が必要な場合
   type InputProps = Omit<ComponentPropsWithoutRef<'input'>, 'size'> & {
     inputSize?: 'sm' | 'md' | 'lg'
   }

   // interface で表現可能な場合
   interface InputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'size'> {
     inputSize?: 'sm' | 'md' | 'lg'
   }
   ```

### レビューガイドライン

コードレビュー時は以下をチェックしてください：

- [ ] オブジェクト型の定義に `interface` を使用しているか
- [ ] `type` を使用している場合、それは例外的なケース（ユニオン型、マップド型など）か
- [ ] 型名は大文字で始まる PascalCase になっているか
- [ ] Props には `Props` サフィックスがついているか（例: `ButtonProps`, `ModalProps`）

## その他のコーディング規約

### コードフォーマット

- **JavaScript/TypeScript**: Biome を使用

すべてのコード変更後は必ず以下を実行：

```bash
# JavaScript/TypeScript
pnpm run check --fix
```

### コミットメッセージ

Conventional Commits の形式に従う：

```
<type>(<scope>): <description>

例:
feat(web): add new video search functionality
fix(admin): resolve authentication issue
refactor(admin): convert type definitions to interface
```

### Next.js 固有の規約

- **Cache Directives**: `'use cache'` の直後には必ず空行を入れる
- **Partial Prerendering**: ページ全体を Suspense で囲まない
- **Params**: Next.js 15+ では `params` を直接 await する

詳細は [AGENTS.md](../AGENTS.md) を参照してください。

## カラーパレットの使用

### テーマカラーの優先使用

**原則として、UI要素には `@shinju-date/tailwind-config/theme.css` で定義されているテーマカラーを使用してください。**

#### 利用可能なテーマカラー

```css
/* ブランドカラー（プライマリ） */
774-nevy-*    /* 50-950 の10段階、プライマリは 774-nevy-950 */

/* セカンダリカラー */
774-pink-*    /* 50-950 の10段階、セカンダリは 774-pink-500 */
774-blue-*    /* 50-950 の10段階、セカンダリは 774-blue-700 */

/* エイリアス */
primary                       /* = 774-nevy-950 */
primary-foreground            /* = 774-nevy-50 */
secondary-pink               /* = 774-pink-500 */
secondary-pink-foreground    /* = 774-pink-50 */
secondary-blue               /* = 774-blue-700 */
secondary-blue-foreground    /* = 774-blue-50 */
```

#### 使用例

##### ✅ 推奨: テーマカラーを使用

```tsx
// ボタン - secondary-blue を使用
<button className="bg-secondary-blue text-white hover:bg-774-blue-800">
  クリック
</button>

// リンク - 774-blue を使用
<Link className="text-774-blue-600 hover:text-774-blue-800" href="/page">
  詳細を見る
</Link>

// ダッシュボードウィジェット - 774-nevy を使用
<div className="bg-774-nevy-50 p-4">
  <p className="text-774-nevy-600">統計情報</p>
</div>

// バッジ - 774-blue を使用
<span className="border-774-blue-300 bg-774-blue-100 text-774-blue-800">
  情報
</span>
```

##### ❌ 非推奨: 一般的な Tailwind カラーを使用しない

```tsx
// ❌ 一般的な blue を使用
<button className="bg-blue-600 text-white">クリック</button>

// ❌ 一般的な purple を使用
<div className="bg-purple-50">統計</div>

// ❌ 一般的な indigo を使用
<Link className="text-indigo-600">リンク</Link>
```

### セマンティックカラー

**地・文字・枠・状態の表示には、`theme.css` で定義されているセマンティックカラー（用途で名付けた色）を使用してください。**

`background` などのセマンティックカラーは `prefers-color-scheme` でライトとダークの値が切り替わるため、`dark:` で色を手書きする必要はありません。色の一覧と用途は [`packages/tailwind-config/theme.css`](../packages/tailwind-config/theme.css) と Storybook の「Design System/Colors」を参照してください。

新しいセマンティックカラーを追加するときは、カラーコードを直接書かず、既存の色見本や Tailwind の標準色を `var()` で参照してください。

#### 1. 状態（Success / Danger / Warning）

```tsx
// ✅ 状態色の文字と、同じ色の 10% の地
<div className="bg-success/10 text-success">保存に成功しました</div>

<div className="border border-danger/30 bg-danger/10 text-danger">
  エラーが発生しました
</div>

<button className="border border-danger text-danger hover:bg-danger/10">
  削除
</button>

<span className="text-warning">非表示</span>

// ❌ 一般的な Tailwind カラーを使用しない
<div className="bg-red-50 text-red-600">エラーが発生しました</div>
```

#### 2. 地・文字・枠

```tsx
// ✅ 1つのクラスでライトとダークの両方に対応
<div className="border border-border bg-surface">
  <p className="text-foreground">本文</p>
  <p className="text-muted">説明文</p>
</div>

// ❌ dark: で色を手書きしない
<div className="border-gray-300 bg-white dark:border-zinc-700 dark:bg-zinc-800">
  <p className="text-gray-900 dark:text-zinc-100">本文</p>
</div>
```

### UIコンポーネントライブラリでの使用

`packages/ui` のコンポーネントでは、以下のようにセマンティックカラーを使用します：

```tsx
// Button コンポーネント
const buttonVariants = cva('...', {
  variants: {
    variant: {
      primary: 'bg-accent text-accent-foreground hover:bg-accent/90',
      secondary:
        'border border-border bg-surface text-foreground hover:bg-muted',
      danger: 'border border-danger text-danger hover:bg-danger/10',
    },
  },
})

// Badge コンポーネント
const badgeVariants = cva('...', {
  variants: {
    variant: {
      info: 'border-accent/30 bg-accent/10 text-accent',
      success: 'border-success/30 bg-success/10 text-success',
      error: 'border-danger/30 bg-danger/10 text-danger',
      warning: 'border-warning/30 bg-warning/10 text-warning',
    },
  },
})
```

### カラーマッピングガイド

既存のコードを更新する際の参考：

| 旧カラー                      | 新カラー                                                                    | 用途                         |
| ----------------------------- | --------------------------------------------------------------------------- | ---------------------------- |
| `blue-*`                      | `774-blue-*`                                                                | リンク、ボタン、情報表示     |
| `purple-*`                    | `774-nevy-*`                                                                | ブランド要素、強調表示       |
| `indigo-*`                    | `774-nevy-*` または `774-blue-*`                                            | コンテキストに応じて         |
| `pink-*`                      | `774-pink-*`                                                                | セカンダリアクション、エラー |
| `green-*`                     | `success`                                                                   | 成功、公開状態               |
| `red-*`                       | `danger`                                                                    | エラー、削除、危険           |
| `yellow-*`                    | `warning`                                                                   | 警告、非表示状態             |
| `gray-*`, `slate-*`, `zinc-*` | `background` / `surface` / `muted` / `border` / `foreground` / `text-muted` | 地、枠、テキスト             |

### レビューガイドライン

コードレビュー時は以下をチェックしてください：

- [ ] UI要素にテーマカラー（774-nevy、774-pink、774-blue）を使用しているか
- [ ] 地・文字・枠・状態にセマンティックカラーを使い、`dark:` で色を手書きしていないか
- [ ] 一般的な blue/purple/indigo カラーが使用されていないか
- [ ] ブランドの一貫性が保たれているか

## 参考資料

- [TypeScript Handbook - Interfaces](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces)
- [TypeScript Deep Dive - Interfaces vs Type Aliases](https://basarat.gitbook.io/typescript/type-system/type-compatibility)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

このガイドラインに関する質問や改善提案は、Issue や Pull Request でお気軽にお寄せください。
