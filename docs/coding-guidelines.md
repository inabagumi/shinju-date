# コーディングガイドライン

このドキュメントでは、SHINJU DATEプロジェクトにおけるコーディング規約とベストプラクティスを定めます。

## TypeScript 型定義

### 基本方針: interface を優先

**原則として、オブジェクトの型定義には `interface` を使用してください。**

`pnpm run check` が、oxlint の `typescript/consistent-type-definitions` で確かめます。`type X = { … }` と書くとエラーになります。ユニオン型や `z.infer<typeof schema>` のような、ほかの型から導く `type` は対象になりません。

`interface` には暗黙のインデックスシグネチャがないため、`Record<string, …>` を受け取る関数に渡せないことがあります。その場合だけ、`// oxlint-disable-next-line typescript/consistent-type-definitions -- <理由>` を付けて `type` を使います。

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
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled }: ButtonProps) {
  // ...
}

// 関数のオプション
interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
}

async function fetchData(url: string, options?: FetchOptions) {
  // ...
}

// 拡張の例
interface BaseProps {
  id: string;
  name: string;
}

interface ExtendedProps extends BaseProps {
  description: string;
}
```

##### ❌ 非推奨: type を使用しない

```typescript
// ❌ Props に type を使用
type ButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

// ❌ オプションに type を使用
type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
};
```

### 例外: type を使用する場合

以下の場合に限り、`type` の使用を許可します：

#### 1. ユニオン型（Union Types）

```typescript
// ✅ ユニオン型は type を使用
type Status = "pending" | "approved" | "rejected";
type Result = Success | Error;
type ID = string | number;
```

#### 2. インターセクション型（Intersection Types）

```typescript
// ✅ インターセクション型は type を使用
interface WithTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: string;
  name: string;
}

type UserWithTimestamps = User & WithTimestamps;
```

#### 3. マップド型（Mapped Types）

```typescript
// ✅ マップド型は type を使用
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};
```

#### 4. 条件型（Conditional Types）

```typescript
// ✅ 条件型は type を使用
type NonNullable<T> = T extends null | undefined ? never : T;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;
```

#### 5. タプル型（Tuple Types）

```typescript
// ✅ タプル型は type を使用
type Point = [number, number];
type RGB = [number, number, number];
```

#### 6. 関数型の単純な定義

```typescript
// ✅ 関数型の簡潔な定義は type を使用可能
type EventHandler = (event: Event) => void;
type Predicate<T> = (value: T) => boolean;

// ただし、interface でも定義可能
interface EventHandler {
  (event: Event): void;
}
```

### 既存コードのリファクタリング

既存のコードで `type` を使用している箇所を `interface` に変更する際の手順：

1. **Props の変換**

   ```typescript
   // Before
   type MyComponentProps = {
     title: string;
     children: React.ReactNode;
   };

   // After
   interface MyComponentProps {
     title: string;
     children: React.ReactNode;
   }
   ```

2. **ComponentPropsWithoutRef との組み合わせ**

   ```typescript
   // Before
   type ButtonProps = ComponentPropsWithoutRef<"button"> & {
     variant?: "primary" | "secondary";
   };

   // After
   interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
     variant?: "primary" | "secondary";
   }
   ```

3. **Omit/Pick との組み合わせ**

   ```typescript
   // type が必要な場合
   type InputProps = Omit<ComponentPropsWithoutRef<"input">, "size"> & {
     inputSize?: "sm" | "md" | "lg";
   };

   // interface で表現可能な場合
   interface InputProps extends Omit<
     ComponentPropsWithoutRef<"input">,
     "size"
   > {
     inputSize?: "sm" | "md" | "lg";
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

- **リント**: Ultracite のプリセットを使った oxlint（JavaScript、TypeScript）と Stylelint（CSS）を使用
- **整形**: Ultracite のプリセットを使った oxfmt を使用（JavaScript、TypeScript、CSS、Markdown、YAML、JSON。import と Tailwind のクラスの並べ替えを含む）

すべてのコード変更後は必ず以下を実行：

```bash
pnpm run fix
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
- `pnpm run check:cache-directives`（`scripts/check-cache-directives.mjs`）が確かめる（oxlint のルールでは、まだ確かめていないため）

ディレクティブとキャッシュの設定を、本文から一目で区別できるようにするためです。過去に、まとめて直しています。

```typescript
// ✅ 正しい
async function getTalent(id: string) {
  "use cache: remote";

  cacheLife("hours");
  cacheTag(CACHE_TAGS.TALENTS);

  return await db.query(/* ... */);
}

// ❌ 間違い: ディレクティブと設定の後に空行がない
async function getTalent(id: string) {
  "use cache: remote";
  cacheLife("hours");
  return await db.query(/* ... */);
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
  - 状態（メンテナンスモードなど）や、管理者が登録した値、全期間の集計を持つキーは例外とする。期限を付けるとデータが消えるため。例外のキーには、`REDIS_KEYS` の定義に `// 期限なし: <理由>` のコメントを付ける

```typescript
// packages/constants/src/index.ts
export const REDIS_KEYS = {
  // ... 既存のキー
  // Dashboard summary trend snapshots (format: prefix + YYYYMMDD)
  SUMMARY_STATS_PREFIX: "summary:stats:",
} as const;
```

```typescript
import { REDIS_KEYS, TIME_ZONE } from "@shinju-date/constants";
import { formatDateKey } from "@shinju-date/temporal-fns";

// ✅ 正しい
const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE);
const key = `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${formatDateKey(now)}`; // summary:stats:20251111
await redis.set(key, data, { ex: 30 * 24 * 60 * 60 }); // 30日

// ❌ 間違い: キーを直接書き、TTL がない
await redis.set("summary:stats:2025-11-11", data);
```

## 時刻の扱い

### `Date` ではなく `Temporal` を使う

- `new Date()` と `Date.now()` は、原則として使わない。サーバーとブラウザで値がずれ、React のハイドレーションのエラーの主な原因になる
  - ライブラリとの受け渡しなど、やむを得ない場合だけ使う。その場合も、サーバーとブラウザで値が違いうることに注意する
  - `pnpm run check` が、`Date` を使っている箇所をエラーにする（`no-restricted-globals`）。やむを得ず使う行には、`// oxlint-disable-next-line no-restricted-globals -- <理由>` のように、理由を書いて付ける
  - テストのファイル（`**/*.test.*`、`**/e2e/**`）は対象外（`vi.setSystemTime(new Date(…))` などで使う）
- 時刻には、グローバルの `Temporal` を使う。`import { Temporal } from 'temporal-polyfill'` とは書かない
  - サーバー（Node.js v26 以降）では、ネイティブ実装が使われる。ブラウザでは、各アプリの `instrumentation-client.ts` が `temporal-polyfill/global` を読み込み、ネイティブ実装がない場合だけポリフィルする
  - `pnpm run check` が、`temporal-polyfill` とそのサブパス（`temporal-polyfill/global` など）からの import をエラーにする（`no-restricted-imports`）。各アプリの `instrumentation-client.ts` は対象外
- テストで現在時刻を固定するときは、`vi.mock('temporal-polyfill')` ではなく、`vi.spyOn(Temporal.Now, 'instant')` などを使う
- タイムゾーンに依存しない絶対時刻は、`Temporal.Now.instant()` で取る
- API で送受信するときは、ISO 8601 の文字列にする。`Temporal.Instant` の `toString()` は、常に UTC（末尾が `Z`。例: `2025-11-01T12:00:00Z`）で出力する。タイムゾーン付きの文字列（例: `2025-11-01T21:00:00+09:00`）が要る場合は、`Temporal.ZonedDateTime` の `toString()` を使う
- ユーザーに時刻を表示するときなど、タイムゾーンが要る場合は、`'Asia/Tokyo'` などを直接書かず、`@shinju-date/constants` の `TIME_ZONE` を使う
  - `pnpm run check` が、`'Asia/Tokyo'` を含む文字列をエラーにする（`config/oxlint/src/no-hardcoded-time-zone.ts`）。`TIME_ZONE` の定義と、テストのファイルは対象外

```typescript
import { TIME_ZONE } from "@shinju-date/constants";

const now = Temporal.Now.instant(); // 現在の絶対時刻（UTC）
const isoString = now.toString(); // 保存や送信のための文字列
const fromString = Temporal.Instant.from("2025-11-01T12:00:00Z"); // 文字列から戻す
const tokyoTime = now.toZonedDateTimeISO(TIME_ZONE); // 日本時間で表示する
```

### データベースに保存する

データベースの `TIMESTAMPTZ` のカラムに、`Temporal.Instant` や `Temporal.ZonedDateTime` の値を保存するときは、**必ず** `@shinju-date/temporal-fns` の `toDBString` を使います。

`toDBString` は、秒未満を切り捨て、UTC の ISO 8601 の文字列にします。YouTube API から取った日時と、`Temporal.Now` で作った日時の精度がそろい、意図しないデータの更新を防げます。`toString()` を直接使うと、秒未満が残り、データの不整合の原因になります。

```typescript
import { toDBString } from "@shinju-date/temporal-fns";

const now = Temporal.Now.instant();

await supabase
  .from("announcements")
  .update({ start_at: toDBString(now) }) // ✅ now.toString() は使わない
  .eq("id", announcementId);
```

`updated_at` は、UPDATE で書きません。すべてのテーブルに、行を更新するとデータベースの現在時刻（秒に切り捨て）を入れるトリガー（`handle_updated_at`）が付いており、書いた値は使われないためです。ほかの列を変えずに `updated_at` だけを進めるときは、`touch_talent` / `touch_thumbnail` のように、トリガーを動かすデータベースの関数を呼びます。INSERT のときは、1回の処理で挿入する行の時刻を揃えるため、`created_at` / `updated_at` に `toDBString(now)` を入れてかまいません。

## admin の Server Action の認証

`apps/admin` は `proxy.ts` でセッションを守っていますが、`matcher` の変更やリダイレクトの処理の不備に左右されないよう、Server Action ごとにも認証を確かめます（多層防御）。データを変更する Server Action は、`@/lib/action` のラッパーで作ります。

- **必ず** `adminAction` か `adminFormAction` で作る。ラッパーは、入力値の検証や外部 API の呼び出しより前に `requireAuthenticatedUser()` で認証を確かめ、未認証なら `handler` を呼ばずに共通のレスポンスを返す
  - `ActionResult`（`{ success, error }`）を返す Action: `adminAction(name, handler)`。未認証なら `unauthenticatedResult()` を返す
  - `FormState` を返す Action（`useActionState` 用）: `adminFormAction(name, schema, handler)`。未認証なら `unauthenticatedFormState()` を返し、`FormData` を `schema` で検証してから `handler` を呼ぶ。`handler` が何も返さなければ `{ success: true }` を返す。隠しフィールド（`id` など）の検証のエラーは、4つめの引数の `{ hiddenFields: ['id'] }` で、項目に結び付かないエラー（`generic`）にする
- 画面に見せてよい失敗（「すでに登録されています。」など）は `ActionError` を投げる。項目に結び付けるときは `new ActionError(message, { field })` とする
- それ以外の例外は、ラッパーが `logger.error` に記録し、決まった文を返す。Supabase のエラーなど、例外の文を画面に返さない
- Supabase のクライアントは、`handler` に渡される `supabaseClient` を使う（`createSupabaseServerClient()` を別に呼ばない）
- サービスロールキーのクライアント（`@/lib/supabase/admin`）や Redis を使う Action は、RLS で守られないため、特にラッパーを忘れない
- Action は `_actions/` に置く。`apps/admin/app/(dashboard)/_lib/server-actions-auth.test.ts` は、`app/(dashboard)/` の `_actions/` のモジュールが公開する関数をすべて集め、未認証のときに副作用がなく、共通のレスポンスを返すことを確かめる。テストへの追加は要らない
  - `_actions/` には、Server Action だけを置く（公開している関数は、すべてテストの対象になる）
  - `_actions/` の外に `'use server'` で始まるファイルがあると、このテストが失敗する

```typescript
"use server";

import { type ActionResult, adminAction } from "@/lib/action";

export const deleteSomethingAction = adminAction(
  "deleteSomethingAction",
  async ({ supabaseClient }, id: string): Promise<ActionResult> => {
    // ... 更新処理

    return { success: true };
  }
);
```

## 管理者のロールと RLS

「Supabase Auth にログインできる = 管理者」とは限りません。管理者は、`app_metadata.role` が `admin` のユーザーです（`apps/admin/lib/admin-user.ts` の `isAdminUser()`、データベースでは `public.is_admin()`）。

- `requireAuthenticatedUser()` と `proxy.ts` は、管理者のロールを持たないユーザーを、未認証として扱う
- 管理画面向けの RLS のポリシーは、`TO "authenticated"` に加えて、**必ず** `(SELECT "public"."is_admin"())` を条件にする（`USING (true)` は使わない）。`supabase/tests/database/admin_role.test.sql` が、これを検査する
- `SECURITY DEFINER` の関数は RLS を迂回するため、関数の中で `public.is_admin()` を確かめる
- ポリシーの名前は、管理画面向けのものを「`<テーブル>: admins can <操作>`」、それ以外を「`<テーブル>: anyone can <操作>`」にする。操作は `read`（`SELECT`）、`insert`、`update`、`delete`、`manage`（`ALL`）。インデックスの名前は `idx_<テーブル>_<列>` にする（複数の列は `_` でつなぐ。並び順は付けない。同じ列の部分インデックスが2つ以上あるときだけ、後ろに条件を付ける）。`supabase/tests/database/naming.test.sql` が、これを検査する

```sql
CREATE POLICY "some_table: admins can update"
    ON "public"."some_table"
    FOR UPDATE
    TO "authenticated"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));
```

## 一覧の絞り込み・検索・並べ替え

管理画面の一覧の絞り込み・検索・並べ替え・ページは、`useState` ではなく、URL のパラメータで持ちます。再読み込みしても残り、URL を共有でき、詳細ページからブラウザの「戻る」で同じ絞り込みに戻れるようにするためです。

- 一覧ごとに、`_lib/search-params-schema.ts` に zod のスキーマを置き、ページ（Suspense の中の部品）で `searchParams` を解釈して、一覧の部品に渡す。正しくない値は、既定の値として扱う
  - 検索語と決まった値のパラメータには、`apps/admin/lib/search-params-schema.ts` の `searchTextParamSchema()` と `enumParamSchema()` を使う
  - クライアントコンポーネントは、スキーマのファイルから型だけを読み込む（zod をクライアントのバンドルに入れない）。既定の値などが要るときは、zod を使わないファイルに置く（例: `talents/_lib/talent-list-filters.ts`）
- URL の書き換えは、`apps/admin/lib/use-update-search-params.ts` の `useUpdateSearchParams()` で行う。絞り込み・検索・並べ替えは `replace` で、`page` を消す（フックの既定）
- 既定の値のときは、パラメータを付けない（`null` を渡して消す）
- 検索ボックスには、`apps/admin/components/search-input.tsx` の `SearchInput` を使う。入力をやめてから少し待って URL に反映し、「戻る」などで URL が変わったら入力欄を合わせる
- フォームの入力中の値（追加のフォームなど）は、URL に入れない

## アナリティクスの取得関数の置き場所

管理画面のアナリティクス（`apps/admin/app/(dashboard)/analytics/`）の取得関数は、画面と CSV のエクスポート（`apps/admin/app/api/export/`）の両方から使います。ルートの中に置くと、同じ種類の関数の置き場所が分かれ、エクスポートからルートの中のファイルを読み込むことになるため、次のように分けます。

- Redis や Supabase を読む取得関数は、`apps/admin/lib/analytics/` に置く
- 期間で集計する取得関数は、`({ range: { start, end }, limit? })` の形で引数を取る（`apps/admin/lib/analytics/period.ts` の `PeriodQuery` と `RankingQuery`）。`start` と `end` は両端を含む `YYYY-MM-DD` の文字列で、1日だけのときは同じ日を渡す。`Temporal` のオブジェクトはキャッシュのキーにできないため、文字列で渡す
- ルートの `_lib/` には、URL のパラメータの解釈（`search-params-schema.ts`、`analytics-url-params.ts`、`resolve-period.ts` など）と、表示用の整形（`format-date.ts`、指標の評価と凡例の文を作る `metric-ratings.ts` など）だけを置く。Redis や Supabase を読む関数は置かない

## 公開サイトの部品の置き場所

公開サイト（`apps/web`）の部品は、どこで使うかで置き場所を分けます。置き場所を見れば影響の範囲が分かり、1つのルートのための変更で、ほかのルートを確かめ直さずに済むようにするためです。

| 置き場所 | 置くもの |
| --- | --- |
| `apps/web/components/` | 2つ以上のルートで使うコンポーネント |
| `apps/web/app/_components/` | ルートのレイアウト（ヘッダー、フッター、検索モーダル、お知らせ）だけが使うコンポーネント |
| 各ルートの `_components/` | そのルートだけが使うコンポーネント（例: 動画の一覧の絞り込みは `apps/web/app/videos/[[...queries]]/_components/video-filters.tsx`） |
| `apps/web/lib/` | フックと、表示に関係しない関数・定数（例: `use-today.ts`、`talent-profile-image.ts`、`svg-symbols.ts`） |

- コンポーネントのファイルには、表示に関係しない関数を置かない。OG 画像（`opengraph-image.tsx`）などのコンポーネントではないファイルが使う関数と定数は、`lib/` に置き、コンポーネントもそこから読み込む
- 1つのルートだけが使う関数は、そのルートの `_lib/` に置いてもよい（例: `apps/web/app/talents/[id]/_lib/og-image.ts`）
- 2つ目のルートが使うことになったときに、`components/` へ移す。使うルートが1つに減ったときは、そのルートの `_components/` へ移す

## 共有パッケージに置くもの

`packages/helpers`（小さな関数）と `packages/constants`（定数）は、複数のアプリやパッケージが使うものの置き場所です。1つのアプリだけが使うものまで置くと、どこで使われているかを追いにくくなり、そのアプリのための変更で、関係のないアプリまでビルドとテストをやり直すことになります。

- `packages/helpers` と `packages/constants` には、2つ以上のアプリ（またはパッケージ）が使うものだけを置く
- 1つのアプリだけが使うものは、そのアプリの `lib/` に置く（例: 公開サイトの名前や説明は `apps/web/lib/site.ts`、cron のリクエストの検証は `apps/batch/lib/cron.ts`）
- 2つ目のアプリやパッケージが使うことになったときに、パッケージへ移す
- 関数と一緒に公開する型（引数や戻り値の型）は、その関数の一部として数える
- `packages/constants` には、定数だけを置く。例外は、Twitch の配信中の ID を扱う関数（`packages/constants/src/twitch-live-id.ts`）。ブラウザ向けの出力に Twitch の SDK を入れないために、`@shinju-date/twitch-api-client` ではなく、ここに置いている

## 色

色・文字サイズ・角丸・影の決まりは、[デザインガイドライン](design-guidelines.md)にまとめています。色は [design-guidelines.md の「色」](design-guidelines.md#色)を参照してください。

## 参考資料

- [TypeScript Handbook - Interfaces](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces)
- [TypeScript Deep Dive - Interfaces vs Type Aliases](https://basarat.gitbook.io/typescript/type-system/type-compatibility)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

このガイドラインに関する質問や改善提案は、Issue や Pull Request でお気軽にお寄せください。
