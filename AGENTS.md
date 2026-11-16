# AGENTS.md

SHINJU DATE で作業する AI エージェント向けの、このプロジェクトだけの決まりです。詳しい説明がほかの文書にある決まりは、要点とリンクだけを載せています。

## 目次

- [環境のセットアップ](#環境のセットアップ)
- [品質チェック](#品質チェック)
- [Next.js の公式スキル](#nextjs-の公式スキル)
- [各アプリの AGENTS.md](#各アプリの-agentsmd)
- [TypeScript の型定義](#typescript-の型定義)
- [デザイン](#デザイン)
- [キャッシュのディレクティブ](#キャッシュのディレクティブ)
- [Partial Prerendering](#partial-prerendering)
- [Redis のキー](#redis-のキー)
- [時刻の扱い](#時刻の扱い)
- [admin の Server Action の認証](#admin-の-server-action-の認証)
- [管理者のロールと RLS](#管理者のロールと-rls)
- [MSW による認証の模擬](#msw-による認証の模擬)
- [コミットとプルリクエスト](#コミットとプルリクエスト)

## 環境のセットアップ

- 作業を始める前に、[セットアップガイド](docs/setup-guide.md)を読む
- Dev Container の設定（`.devcontainer/`）を変えたら、`@devcontainers/cli` でビルドして確かめる（[Dockerfile のテスト](.devcontainer/README.md#dockerfile-のテスト)）

## 品質チェック

- コードを変えたら、**必ず** `pnpm run check --fix` を実行する（Biome によるフォーマット、リント、未使用の import の削除）
- TypeScript を変えたら、`pnpm run typecheck`（1つのパッケージなら `pnpm run typecheck --filter=<パッケージ名>`）も実行する

理由: CI で同じものが実行され、失敗するとマージできません。Vitest はテストのファイルの型を検査しないため、[型チェック](CONTRIBUTING.md#型チェック)は別に要ります。

## Next.js の公式スキル

`.agents/skills/` に Next.js の公式スキルを4つ入れています（`.claude/skills/` からシンボリックリンク）。[使いどころ](docs/agent-skills.md#入れているスキル)と [`agent-browser` の入れ方](docs/agent-skills.md#agent-browser)も読んでください。

- `next-dev-loop`: 起動中の `next dev` に対して、MCP（`/_next/mcp`）と `agent-browser` で編集のたびに動作を確かめる
- `next-cache-components-optimizer`: 指定したルートの静的シェルを広げ、`instant()` テストを回帰テストとして残す
- `next-partial-prefetching-optimizer`: 指定した遷移で、クリック前に用意しておく UI を `instant()` テストで決めて最適化する
- `next-bundle-optimizer`: 初期ロードを重くしているクライアントバンドルを特定する（既定は変更を加えない監査）

`.agents/skills/next-*`、`.claude/skills/next-*`、`skills-lock.json` は `skills` CLI が置いたファイルです。手で編集せず、`pnpm dlx skills update` で更新してください。

## 各アプリの AGENTS.md

- `apps/*/AGENTS.md` の `<!-- BEGIN:nextjs-agent-rules -->` から `<!-- END:nextjs-agent-rules -->` までは `next dev` が書き込む。手で編集しない
- `next dev` が書き換えた差分は、そのままコミットする

## TypeScript の型定義

- オブジェクトの型（React の Props、関数のオプションなど）は `type` ではなく `interface` で定義する（[理由と例](docs/coding-guidelines.md#typescript-型定義)）
- ユニオン型、交差型、マップ型、条件型、タプル型は `type` を使う

## デザイン

画面や部品を新しく作る・作り直すときは、**必ず**[デザインのガイドライン](docs/design-guidelines.md)に従う。要点は次のとおりです。

- 色はセマンティックカラー（`bg-surface`、`text-muted`、`bg-accent` など）で指定し、`dark:` で手書きしない
- 文字サイズは `text-display` / `text-title` / `text-heading` / `text-body` / `text-meta` / `text-caption` を使う（`text-xs` / `text-sm` などは使わない）
- 角丸は `rounded-control`（操作部品）/ `rounded-container`（入れ物）/ `rounded-full`（丸）の3種類（`rounded-md` / `rounded-xl` などは使わない）
- 影は重なるもの（モーダル、ドロップダウン、お知らせバナー）だけに `shadow-overlay` を使う。固定ヘッダーは影を付けず、下端を `border` の線1本で区切る
- `twMerge` は `tailwind-merge` ではなく `@shinju-date/ui` からインポートする（`pnpm run check` が確かめる）
- 日本語のウェブフォントは追加しない

## キャッシュのディレクティブ

**🚨 厳格なルール**（例外なく、すべてのファイルに適用する）

- `'use cache'`（`'use cache: remote'` / `'use cache: private'` を含む）の直後に、空行を1行入れる
- `cacheLife()` や `cacheTag()` などのキャッシュ設定の並びの後にも、空行を1行入れる
- キャッシュはコンポーネントではなく、データ取得関数に付ける。`generateMetadata` とページの部品の両方から同じキャッシュを使える
- `'use cache'` を持つ関数を呼ぶ側で、もう一度キャッシュのディレクティブを付けない
- 公開データには `'use cache: remote'`、認証が必要なデータには `'use cache: private'`（ユーザーごと）を使う

理由: ディレクティブと設定を本文から一目で区別できるようにするためです。過去にまとめて直しています。

```typescript
async function getTalent(id: string) {
  'use cache: remote'

  cacheLife('hours')
  cacheTag('talents')

  return await db.query(/* ... */)
}
```

次のように、ディレクティブや設定の直後に空行なしで本文を続けてはいけません。

```typescript
async function getTalent(id: string) {
  'use cache: remote'
  cacheLife('hours')
  return await db.query(/* ... */) // ❌ 空行がない
}
```

## Partial Prerendering

`apps/web` と `apps/admin` は Cache Components（`cacheComponents`）と Partial Prefetching（`partialPrefetching`）を有効にしています。ページの静的な部分を事前にレンダリングしたシェルとして先に返し、動的な部分を後からストリーミングします。

- ページ全体を1つの Suspense で囲まない
- 静的なもの（ナビゲーションのリンク、見出し、レイアウト）は Suspense の外に置く
- 非同期のデータ取得をする部品だけを、それぞれ個別の Suspense で囲む
- `params` と `searchParams` はページで await せず、Suspense の中の部品に Promise のまま渡して、部品の中で await する
  - ページで await すると、ページ全体が事前にレンダリングできなくなり、「runtime data during prerendering」のエラーになる
  - このエラーを `export const instant = false` で黙らせない（静的なシェルを失うだけ）
  - 同じデータを複数の部品で使うときは、取得関数を `'use cache'` でキャッシュし、それぞれの部品から呼ぶ
- `generateMetadata` では `params` を直接 await してよい（メタデータは、`params` を読むほかの部品と一緒に後からストリーミングされる）
- `params` の型は、Next.js が生成する `PageProps<'/talents/[id]'>` / `LayoutProps` を使う

理由: 静的なシェルを先に返すことで、最初の表示が速くなり、検索エンジンにも内容が届きます。

```typescript
// ページは async にせず、params を await しない
export default function TalentDetailPage({
  params,
}: PageProps<'/talents/[id]'>) {
  return (
    <div>
      <Link href="/talents">タレント一覧に戻る</Link>
      <Suspense fallback={<TalentProfileSkeleton />}>
        <TalentProfile params={params} />
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
```

次のように、ページで `params` を await してはいけません。それより後ろがすべてリクエスト時のレンダリングになります。

```typescript
export default async function TalentDetailPage({ params }: Props) {
  const { id } = await params // ❌
  // ...
}
```

### `notFound()` とステータスコード

- Suspense の中で `notFound()` を呼ぶと、ステータスコードは 200 のまま、not-found の画面と `<meta name="robots" content="noindex">` を返す（開発サーバーでは 404 になるが、本番とは違う）
- HTTP の 404 が必要な場合は、Proxy（`proxy.ts`）でページをレンダリングする前に判定する

## Redis のキー

- すべての Redis のキー（プレフィックスと固定のキー）は、`packages/constants/src/index.ts` の `REDIS_KEYS` に定義し、そこから参照する。コードに直接書かない
- 日付を含むキーは、`@shinju-date/temporal-fns` の `formatDateKey`（`YYYYMMDD`、ダッシュなし）で作る
- プレフィックスは用途を示す英語にし、単語をコロンで区切り、末尾にコロンを付ける（例: `SUMMARY_STATS_PREFIX: 'summary:stats:'`）
- 必要に応じて、`REDIS_KEYS` の定義にコメントで用途を書く
- すべてのキーに TTL を付ける

理由: キーの重複を防ぎ、変更したときの影響範囲をつかめるようにするためです。TTL はメモリの肥大化を防ぎます。

```typescript
import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDateKey } from '@shinju-date/temporal-fns'

const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
const key = `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${formatDateKey(now)}` // summary:stats:20251111

await redis.set(key, data, { ex: 30 * 24 * 60 * 60 }) // 30日
```

## 時刻の扱い

- `new Date()` と `Date.now()` は原則として使わない。ライブラリとの受け渡しなど、やむを得ない場合だけ、サーバーとブラウザで値が違いうることに注意して使う
- 時刻には、グローバルの `Temporal` を使う。`import { Temporal } from 'temporal-polyfill'` とは書かない
  - サーバー（Node.js v26 以降）はネイティブ実装を使う。ブラウザでは、各アプリの `instrumentation-client.ts` が `temporal-polyfill/global` を読み込み、ネイティブ実装がない場合だけポリフィルする
- テストで現在時刻を固定するときは、`vi.mock('temporal-polyfill')` ではなく `vi.spyOn(Temporal.Now, 'instant')` などを使う
- 現在の絶対時刻は `Temporal.Now.instant()` で取る
- API で送受信するときは ISO 8601 の文字列にする。`Temporal.Instant` の `toString()` は常に UTC（末尾が `Z`）。タイムゾーン付きの文字列が要る場合は `Temporal.ZonedDateTime` の `toString()` を使う
- タイムゾーンは直接書かず（`'Asia/Tokyo'` など）、`@shinju-date/constants` の `TIME_ZONE` を使う
- データベースの `TIMESTAMPTZ` のカラムに保存するときは、**必ず** `@shinju-date/temporal-fns` の `toDBString` を使う（`toString()` を直接使わない）

理由: `Date` はサーバーとブラウザで値がずれ、ハイドレーションのエラーの原因になります。`toDBString` は秒未満を切り捨てて UTC にするので、YouTube API から取った日時と `Temporal.Now` の日時の精度がそろい、意図しない更新を防げます。

```typescript
import { TIME_ZONE } from '@shinju-date/constants'
import { toDBString } from '@shinju-date/temporal-fns'

const now = Temporal.Now.instant()

await supabase
  .from('videos')
  .update({ updated_at: toDBString(now) })
  .eq('id', videoId)

const tokyoTime = now.toZonedDateTimeISO(TIME_ZONE) // 表示用
```

## admin の Server Action の認証

- データを変更する Server Action では、**必ず** `@/lib/auth` の `requireAuthenticatedUser()` を関数の先頭で呼ぶ（入力値の検証や外部 API の呼び出しより前）
- 未認証なら更新せず、共通のレスポンスを返す
  - `{ success, error }` を返す Action: `unauthenticatedResult()`
  - `FormState` を返す Action（`useActionState` 用）: `unauthenticatedFormState()`
- Supabase のクライアントは `requireAuthenticatedUser()` の戻り値を使う（`createSupabaseServerClient()` を別に呼ばない）
- サービスロールキーのクライアント（`@/lib/supabase/admin`）や Redis を使う Action は RLS で守られないので、特に忘れない
- Action を追加したら、`apps/admin/app/(dashboard)/_lib/server-actions-auth.test.ts` にも追加し、未認証のときに副作用がないことを確かめる

理由: `apps/admin` は `proxy.ts` でセッションを守っていますが、`matcher` の変更やリダイレクトの不備に左右されないよう、Action ごとにも確かめます（多層防御）。

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

- 「Supabase Auth にログインできる = 管理者」ではない。管理者は `app_metadata.role` が `admin` のユーザー（`apps/admin/lib/admin-user.ts` の `isAdminUser()`、データベースでは `public.is_admin()`）
- `requireAuthenticatedUser()` と `proxy.ts` は、管理者のロールを持たないユーザーを未認証として扱う
- 管理画面向けの RLS のポリシーは、`TO "authenticated"` に加えて、**必ず** `(SELECT "public"."is_admin"())` を条件にする（`USING (true)` は使わない）。`supabase/tests/database/admin_role.test.sql` が検査する
- `SECURITY DEFINER` の関数は RLS を迂回するので、関数の中で `public.is_admin()` を確かめる

```sql
CREATE POLICY "Enable update for admins"
    ON "public"."some_table"
    FOR UPDATE
    TO "authenticated"
    USING ((SELECT "public"."is_admin"()))
    WITH CHECK ((SELECT "public"."is_admin"()));
```

## MSW による認証の模擬

`apps/admin` の認証が要る画面は、[MSW](docs/msw-guide.md) のハンドラーが Supabase Auth を模擬するので、本物のバックエンドなしで確かめられます。

- `ENABLE_MSW=true` に加えて `MSW_SUPABASE_AUTHENTICATED=true` を設定すると、ログインしなくても管理者のロールを持つモックのユーザー（`admin@example.com`）として扱われる
  - セッションの Cookie がない場合は、`apps/admin/lib/supabase/mock-session.ts` がモックのセッションを補う。モックのアクセストークンは MSW のハンドラーしか受け付けないので、本番の認証には影響しない
  - ログアウトしても認証済みのまま。ログイン画面を確かめるときは設定しない
- 設定しない場合は、ログインフォームに `admin@example.com` / `password123` を入れてログインする。ログアウトすると Cookie が消える

## コミットとプルリクエスト

- コミットメッセージとプルリクエストのタイトルは、[Conventional Commits の形式](CONTRIBUTING.md#コミットメッセージ)の平易な英語で書く（例: `feat(web): add new feature`、`fix(admin): resolve API issue`）
- スコープは `apps/*` と `packages/*` のアプリやパッケージを単位にする
- [プルリクエスト](CONTRIBUTING.md#pull-request-のフロー)のタイトルはそのままコミットメッセージになるので、日本語を使わず、GitHub の UI に収まる1行にする
- 大きな変更は小さなコミットに分ける
