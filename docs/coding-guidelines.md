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

## キャッシュのディレクティブ

`apps/web` と `apps/admin` は Next.js の Cache Components を使っています。キャッシュのディレクティブは、次のように書きます。

- `'use cache'`（`'use cache: remote'` / `'use cache: private'` を含む）の直後に、空行を1行入れる
- `cacheLife()` や `cacheTag()` などのキャッシュ設定の並びの後にも、空行を1行入れる
- この2つは、例外なく、すべてのファイルに適用する

ディレクティブとキャッシュの設定を、本文から一目で区別できるようにするためです。過去に、まとめて直しています。

```typescript
// ✅ 正しい
async function getTalent(id: string) {
  'use cache: remote'

  cacheLife('hours')
  cacheTag(CACHE_TAGS.TALENTS)

  return await db.query(/* ... */)
}

// ❌ 間違い: ディレクティブと設定の後に空行がない
async function getTalent(id: string) {
  'use cache: remote'
  cacheLife('hours')
  return await db.query(/* ... */)
}
```

### どこにキャッシュを付けるか

- キャッシュは、コンポーネントではなく、データ取得関数に付ける。`generateMetadata` とページの部品の両方から呼んでも、取得は1回で済む
- `'use cache'` を持つ関数を呼ぶ側で、もう一度キャッシュのディレクティブを付けない
- 公開データには `'use cache: remote'`、認証が必要なデータには `'use cache: private'`（ユーザーごと）を使う

```typescript
async function getTalent(id: string) {
  'use cache: private'

  cacheLife('minutes')

  return await db.query(/* ... */)
}

export async function generateMetadata({
  params,
}: Pick<PageProps<'/talents/[id]'>, 'params'>): Promise<Metadata> {
  const { id } = await params
  const talent = await getTalent(id) // 同じキャッシュを使う
  return { title: talent?.name }
}

async function TalentName({
  params,
}: Pick<PageProps<'/talents/[id]'>, 'params'>) {
  const { id } = await params
  const talent = await getTalent(id) // 同じキャッシュを使う
  return <h1>{talent?.name}</h1>
}
```

## Partial Prerendering

`apps/web` と `apps/admin` は、Cache Components（`cacheComponents`）と Partial Prefetching（`partialPrefetching`）を有効にしています。ページの静的な部分を、事前にレンダリングしたシェルとして先に返し、動的な部分を後からストリーミングします。静的なシェルが先に届くので、最初の表示が速くなり、検索エンジンにも内容が届きます。そのため、次のように書きます。

- ページ全体を、1つの Suspense で囲まない。静的な内容まで、Suspense の中に入ってしまう
- 静的なもの（ナビゲーションのリンク、見出し、レイアウト）は、Suspense の外に置く
- 非同期のデータ取得をする部品だけを、それぞれ個別の Suspense で囲む。部品ごとに読み込まれ、それぞれのスケルトンが表示される
- `params` と `searchParams` は、ページで await せず、Suspense の中の部品に Promise のまま渡して、部品の中で await する
  - どちらも、リクエストごとに決まる値です。ページで await すると、それより後ろ（ページ全体）が事前にレンダリングできなくなり、Next.js が「runtime data during prerendering」のエラーを出します
  - このエラーを `export const instant = false` で黙らせないでください。静的なシェルを失うだけで、得るものはありません
  - 同じデータを複数の部品で使う場合は、取得関数を `'use cache'` でキャッシュし、それぞれの部品から呼んでください
- `generateMetadata` では、`params` を直接 await して構わない。ページのほかの部品も `params` を読んでリクエスト時にレンダリングされるので、メタデータは、それらと一緒に後からストリーミングされる
- `params` の型は、Next.js が生成する `PageProps<'/talents/[id]'>` / `LayoutProps` を使う。ルートのパスから `params` の型が決まる

```typescript
// ✅ 正しい: ページは async にせず、params を await しない
export default function TalentDetailPage({
  params,
}: PageProps<'/talents/[id]'>) {
  return (
    <div className="container mx-auto p-4">
      {/* 静的な内容: シェルとして、すぐにレンダリングされる */}
      <Link href="/talents">タレント一覧に戻る</Link>

      {/* params を読む部品: Suspense で個別に囲む */}
      <Suspense fallback={<TalentProfileSkeleton />}>
        <TalentProfile params={params} />
      </Suspense>

      <Suspense fallback={<VideosSkeleton />}>
        <RecentVideosSection params={params} />
      </Suspense>
    </div>
  )
}

async function TalentProfile({
  params,
}: Pick<PageProps<'/talents/[id]'>, 'params'>) {
  const { id } = await params // Suspense の中で await する
  const talent = await getTalent(id) // 'use cache' 付きの取得関数

  if (!talent) {
    notFound()
  }

  return <h1>{talent.name}</h1>
}

// ❌ 間違い: ページで params を await している
export default async function TalentDetailPage({
  params,
}: PageProps<'/talents/[id]'>) {
  const { id } = await params
  // ...
}

// ❌ 間違い: ページ全体を Suspense で囲んでいる
export default function TalentDetailPage({
  params,
}: PageProps<'/talents/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TalentDetailPageContent params={params} />
    </Suspense>
  )
}
```

### `notFound()` とステータスコード

Suspense の中で `notFound()` を呼ぶと、すでにシェルを返し始めているため、ステータスコードは 200 のまま、not-found の画面と `<meta name="robots" content="noindex">` を返します。開発サーバーでは 404 になりますが、本番とは違います。HTTP の 404 が必要な場合は、Proxy（`proxy.ts`）で、ページをレンダリングする前に判定してください。

## Redis のキー

キーの重複を防ぎ、キーを変えたときの影響範囲をつかめるようにするため、Redis のキーは1か所で管理します。

- すべての Redis のキー（プレフィックスと固定のキー）は、`packages/constants/src/index.ts` の `REDIS_KEYS` に定義し、そこから参照する。コードに直接書かない
- 日付を含むキーは、`@shinju-date/temporal-fns` の `formatDateKey` で作る。`YYYYMMDD`（ダッシュなし）を返すので、キーが短く済む
- プレフィックスは、用途を示す英語にする（例: `summary:`、`videos:`、`search:`）。単語はコロンで区切り（例: `videos:clicked:`）、末尾にコロンを付けて、動的な値を足しやすくする
- 必要に応じて、`REDIS_KEYS` の定義に、コメントで用途を書く
- すべてのキーに TTL を付ける。メモリの肥大化を防ぐため

```typescript
// packages/constants/src/index.ts
export const REDIS_KEYS = {
  // ... 既存のキー
  // Dashboard summary trend snapshots (format: prefix + YYYYMMDD)
  SUMMARY_STATS_PREFIX: 'summary:stats:',
} as const
```

```typescript
import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDateKey } from '@shinju-date/temporal-fns'

// ✅ 正しい
const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
const key = `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${formatDateKey(now)}` // summary:stats:20251111
await redis.set(key, data, { ex: 30 * 24 * 60 * 60 }) // 30日

// ❌ 間違い: キーを直接書き、TTL がない
await redis.set('summary:stats:2025-11-11', data)
```

## 時刻の扱い

### `Date` ではなく `Temporal` を使う

- `new Date()` と `Date.now()` は、原則として使わない。サーバーとブラウザで値がずれ、React のハイドレーションのエラーの主な原因になる
  - ライブラリとの受け渡しなど、やむを得ない場合だけ使う。その場合も、サーバーとブラウザで値が違いうることに注意する
- 時刻には、グローバルの `Temporal` を使う。`import { Temporal } from 'temporal-polyfill'` とは書かない
  - サーバー（Node.js v26 以降）では、ネイティブ実装が使われる。ブラウザでは、各アプリの `instrumentation-client.ts` が `temporal-polyfill/global` を読み込み、ネイティブ実装がない場合だけポリフィルする
- テストで現在時刻を固定するときは、`vi.mock('temporal-polyfill')` ではなく、`vi.spyOn(Temporal.Now, 'instant')` などを使う
- タイムゾーンに依存しない絶対時刻は、`Temporal.Now.instant()` で取る
- API で送受信するときは、ISO 8601 の文字列にする。`Temporal.Instant` の `toString()` は、常に UTC（末尾が `Z`。例: `2025-11-01T12:00:00Z`）で出力する。タイムゾーン付きの文字列（例: `2025-11-01T21:00:00+09:00`）が要る場合は、`Temporal.ZonedDateTime` の `toString()` を使う
- ユーザーに時刻を表示するときなど、タイムゾーンが要る場合は、`'Asia/Tokyo'` などを直接書かず、`@shinju-date/constants` の `TIME_ZONE` を使う

```typescript
import { TIME_ZONE } from '@shinju-date/constants'

const now = Temporal.Now.instant() // 現在の絶対時刻（UTC）
const isoString = now.toString() // 保存や送信のための文字列
const fromString = Temporal.Instant.from('2025-11-01T12:00:00Z') // 文字列から戻す
const tokyoTime = now.toZonedDateTimeISO(TIME_ZONE) // 日本時間で表示する
```

### データベースに保存する

データベースの `TIMESTAMPTZ` のカラムに、`Temporal.Instant` や `Temporal.ZonedDateTime` の値を保存するときは、**必ず** `@shinju-date/temporal-fns` の `toDBString` を使います。

`toDBString` は、秒未満を切り捨て、UTC の ISO 8601 の文字列にします。YouTube API から取った日時と、`Temporal.Now` で作った日時の精度がそろい、意図しないデータの更新を防げます。`toString()` を直接使うと、秒未満が残り、データの不整合の原因になります。

```typescript
import { toDBString } from '@shinju-date/temporal-fns'

const now = Temporal.Now.instant()

await supabase
  .from('videos')
  .update({ updated_at: toDBString(now) }) // ✅ now.toString() は使わない
  .eq('id', videoId)
```

## admin の Server Action の認証

`apps/admin` は `proxy.ts` でセッションを守っていますが、`matcher` の変更やリダイレクトの処理の不備に左右されないよう、Server Action ごとにも認証を確かめます（多層防御）。データを変更する Server Action では、次のようにします。

- **必ず** `@/lib/auth` の `requireAuthenticatedUser()` を、関数の先頭で呼ぶ。入力値の検証や外部 API の呼び出しより前に、認証を確かめる
- 未認証の場合は、更新せず、共通のレスポンスを返す
  - `{ success, error }` を返す Action: `unauthenticatedResult()`
  - `FormState` を返す Action（`useActionState` 用）: `unauthenticatedFormState()`
- Supabase のクライアントは、`requireAuthenticatedUser()` の戻り値を使う（`createSupabaseServerClient()` を別に呼ばない）
- サービスロールキーのクライアント（`@/lib/supabase/admin`）や Redis を使う Action は、RLS で守られないため、特に確認を忘れない
- 新しい Action を足したら、`apps/admin/app/(dashboard)/_lib/server-actions-auth.test.ts` にも足し、未認証のときに副作用がないことを確かめる

```typescript
'use server'

import { requireAuthenticatedUser, unauthenticatedResult } from '@/lib/auth'

export async function deleteSomethingAction(id: string): Promise<{
  success: boolean
  error?: string
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient } = auth

  // ... 更新処理
}
```

## 管理者のロールと RLS

「Supabase Auth にログインできる = 管理者」とは限りません。管理者は、`app_metadata.role` が `admin` のユーザーです（`apps/admin/lib/admin-user.ts` の `isAdminUser()`、データベースでは `public.is_admin()`）。

- `requireAuthenticatedUser()` と `proxy.ts` は、管理者のロールを持たないユーザーを、未認証として扱う
- 管理画面向けの RLS のポリシーは、`TO "authenticated"` に加えて、**必ず** `(SELECT "public"."is_admin"())` を条件にする（`USING (true)` は使わない）。`supabase/tests/database/admin_role.test.sql` が、これを検査する
- `SECURITY DEFINER` の関数は RLS を迂回するため、関数の中で `public.is_admin()` を確かめる

```sql
CREATE POLICY "Enable update for admins"
    ON "public"."some_table"
    FOR UPDATE
    TO "authenticated"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));
```

## カラーパレットの使用

色・文字サイズ・角丸・影の使い分けは [design-guidelines.md](design-guidelines.md) を参照してください。ここではクラスの書き方を説明します。

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
      danger: 'border-danger/30 bg-danger/10 text-danger',
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
