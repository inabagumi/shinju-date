# AGENTS.md

SHINJU DATE で作業する AI エージェント向けの、このプロジェクトだけの決まりです。詳しい説明がほかの文書にある決まりは、要点とリンクだけを載せています。

## 目次

- [環境のセットアップ](#環境のセットアップ)
- [品質チェック](#品質チェック)
- [Next.js の公式スキル](#nextjs-の公式スキル)
- [依存のバージョン](#依存のバージョン)
- [各アプリの AGENTS.md](#各アプリの-agentsmd)
- [TypeScript の型定義](#typescript-の型定義)
- [デザイン](#デザイン)
- [キャッシュのディレクティブ](#キャッシュのディレクティブ)
- [Partial Prerendering](#partial-prerendering)
- [共有パッケージに置くもの](#共有パッケージに置くもの)
- [Redis のキー](#redis-のキー)
- [時刻の扱い](#時刻の扱い)
- [admin の Server Action の認証](#admin-の-server-action-の認証)
- [管理者のロールと RLS](#管理者のロールと-rls)
- [MSW による認証の模擬](#msw-による認証の模擬)
- [コミットとプルリクエスト](#コミットとプルリクエスト)

## 環境のセットアップ

- 作業を始める前に、[セットアップガイド](docs/setup-guide.md)を読む
- Dev Container の設定（`.devcontainer/`）を変えたら、`@devcontainers/cli` でビルドして確かめる（[Dev Container のテスト](.devcontainer/README.md#dev-container-のテスト)）

## 品質チェック

- コードを変えたら、**必ず** `pnpm run check --fix` を実行する（Biome によるフォーマット、リント、未使用の import の削除）
- TypeScript を変えたら、`pnpm run typecheck`（1つのパッケージなら `pnpm run typecheck --filter=<パッケージ名>`）も実行する
- Markdown を変えたら、`pnpm run check:docs` も実行する（リポジトリの中へのリンクとファイルのパスが実在するかを確かめる。[ドキュメントのリンク](CONTRIBUTING.md#ドキュメントのリンク)）
- `packages/*` の `tsdown.config.ts` や `package.json` の `exports` を変えたら、ビルドのあとに `pnpm run check:package-exports` も実行する（[パッケージのビルドと `exports`](CONTRIBUTING.md#パッケージのビルドと-exports)）
- `'use cache'`、`cacheLife()`、`cacheTag()` を書いたら、`pnpm run check:cache-directives` も実行する（後ろの空行を確かめる。[キャッシュのディレクティブの空行](CONTRIBUTING.md#キャッシュのディレクティブの空行)）

理由: CI で同じものが実行され、失敗するとマージできません。Vitest はテストのファイルの型を検査しないため、[型チェック](CONTRIBUTING.md#型チェック)は別に要ります。

## Next.js の公式スキル

`.agents/skills/` に Next.js の公式スキルを4つ入れています（`.claude/skills/` からシンボリックリンク）。[使いどころ](docs/agent-skills.md#入れているスキル)と [`agent-browser` の入れ方](docs/agent-skills.md#agent-browser)も読んでください。

- `next-dev-loop`: 起動中の `next dev` に対して、MCP（`/_next/mcp`）と `agent-browser` で編集のたびに動作を確かめる
- `next-cache-components-optimizer`: 指定したルートの静的シェルを広げ、`instant()` テストを回帰テストとして残す
- `next-partial-prefetching-optimizer`: 指定した遷移で、クリック前に用意しておく UI を `instant()` テストで決めて最適化する
- `next-bundle-optimizer`: 初期ロードを重くしているクライアントバンドルを特定する（既定は変更を加えない監査）

`.agents/skills/next-*`、`.claude/skills/next-*`、`skills-lock.json` は `skills` CLI が置いたファイルです。手で編集せず、`pnpm dlx skills update` で更新してください。

## 依存のバージョン

- 2つ以上の `package.json` に書く依存は、`pnpm-workspace.yaml` の `catalog:` にバージョンを書き、各 `package.json` では `"catalog:"` と書く（[依存のバージョン](CONTRIBUTING.md#依存のバージョン)）
- 新しいパッケージを足すときに、ほかの `package.json` からバージョンを写さない

## 各アプリの AGENTS.md

- `apps/*/AGENTS.md` の `<!-- BEGIN:nextjs-agent-rules -->` から `<!-- END:nextjs-agent-rules -->` までは `next dev` が書き込む。手で編集しない
- `next dev` が書き換えた差分は、そのままコミットする

## TypeScript の型定義

- オブジェクトの型（React の Props、関数のオプションなど）は `type` ではなく `interface` で定義する（`pnpm run check` が確かめる。[理由と例](docs/coding-guidelines.md#typescript-型定義)）
- ユニオン型、交差型、マップ型、条件型、タプル型は `type` を使う

## デザイン

画面や部品を新しく作る・作り直すときは、**必ず**[デザインのガイドライン](docs/design-guidelines.md)に従う。要点は次のとおりです。

- 色はセマンティックカラー（`bg-surface`、`text-muted`、`bg-accent` など）で指定し、`dark:` で手書きしない（`pnpm run check` が確かめる）
- 文字サイズは `text-display` / `text-title` / `text-heading` / `text-body` / `text-meta` / `text-caption` を使う（`text-xs` / `text-sm` などは使わない。`pnpm run check` が確かめる）
- 角丸は `rounded-control`（操作部品）/ `rounded-container`（入れ物）/ `rounded-full`（丸）の3種類（`rounded-md` / `rounded-xl` などは使わない。`pnpm run check` が確かめる）
- 影は重なるもの（モーダル、ドロップダウン、お知らせバナー）だけに `shadow-overlay` を使う（`shadow-sm` / `shadow-lg` などは使わない。`pnpm run check` が確かめる）。固定ヘッダーは影を付けず、下端を `border` の線1本で区切る
- 開閉の動きは重なるもの（ダイアログ、トースト、ポップオーバー、メニュー）だけに、`motion-safe:` を付けて `theme.css` の `animate-*` で付ける。閉じる動きは `transition` ではなく `animation` にする（[動き](docs/design-guidelines.md#動き)）
- `twMerge` は `tailwind-merge` ではなく `@shinju-date/ui` からインポートする（`pnpm run check` が確かめる）
- 日本語のウェブフォントは追加しない
- 管理画面で、フォームを使わずに Server Action を呼ぶときは `useServerAction`（`apps/admin/lib/use-server-action.ts`）を使い、結果をトーストで知らせる。成功のあとに `router.refresh()` を呼ばない（[操作の結果の知らせ](docs/design-guidelines.md#操作の結果の知らせ管理画面)）

## キャッシュのディレクティブ

**🚨 厳格なルール**（例外なく、すべてのファイルに適用する。[理由と例](docs/coding-guidelines.md#キャッシュのディレクティブ)）

- `'use cache'`（`'use cache: remote'` / `'use cache: private'` を含む）の直後に、空行を1行入れる（`pnpm run check:cache-directives` が確かめる）
- `cacheLife()` や `cacheTag()` などのキャッシュ設定の並びの後にも、空行を1行入れる（`pnpm run check:cache-directives` が確かめる）
- キャッシュはコンポーネントではなく、データ取得関数に付ける（`generateMetadata` とページの部品の両方から同じキャッシュを使う）
- `'use cache'` を持つ関数を呼ぶ側で、もう一度キャッシュのディレクティブを付けない
- 公開データには `'use cache: remote'`、認証が必要なデータには `'use cache: private'`（ユーザーごと）を使う

## Partial Prerendering

`apps/web` と `apps/admin` は Cache Components と Partial Prefetching を有効にしている（[理由と例](docs/coding-guidelines.md#partial-prerendering)）。

- ページ全体を1つの Suspense で囲まない
- 静的なもの（ナビゲーションのリンク、見出し、レイアウト）は Suspense の外に置く
- 非同期のデータ取得をする部品だけを、それぞれ個別の Suspense で囲む
- `params` と `searchParams` はページで await せず、Suspense の中の部品に Promise のまま渡して、部品の中で await する
  - 「runtime data during prerendering」のエラーを `export const instant = false` で黙らせない
  - 同じデータを複数の部品で使うときは、取得関数を `'use cache'` でキャッシュし、それぞれの部品から呼ぶ
- `generateMetadata` では `params` を直接 await してよい
- `params` の型は、Next.js が生成する `PageProps<'/talents/[id]'>` / `LayoutProps` を使う
- Suspense の中の `notFound()` はステータスコード 200 を返す。HTTP の 404 が要るときは、Proxy（`proxy.ts`）でページをレンダリングする前に判定する（[`notFound()` とステータスコード](docs/coding-guidelines.md#notfound-とステータスコード)）

## 共有パッケージに置くもの

[理由と例](docs/coding-guidelines.md#共有パッケージに置くもの)

- `packages/helpers` と `packages/constants` には、2つ以上のアプリ（またはパッケージ）が使うものだけを置く
- 1つのアプリだけが使うものは、そのアプリの `lib/` に置く

## Redis のキー

[理由と例](docs/coding-guidelines.md#redis-のキー)

- すべての Redis のキー（プレフィックスと固定のキー）は、`packages/constants/src/index.ts` の `REDIS_KEYS` に定義し、そこから参照する。コードに直接書かない
- 日付を含むキーは、`@shinju-date/temporal-fns` の `formatDateKey`（`YYYYMMDD`、ダッシュなし）で作る
- プレフィックスは用途を示す英語にし、単語をコロンで区切り、末尾にコロンを付ける（例: `SUMMARY_STATS_PREFIX: 'summary:stats:'`）
- 必要に応じて、`REDIS_KEYS` の定義にコメントで用途を書く
- すべてのキーに TTL を付ける
  - 状態や、管理者が登録した値、全期間の集計を持つキーは例外とし、`REDIS_KEYS` のコメントに理由を書く（`// 期限なし: <理由>`）

## 時刻の扱い

[理由と例](docs/coding-guidelines.md#時刻の扱い)

- `new Date()` と `Date.now()` は原則として使わない（`pnpm run check` が確かめる。テストのファイルは対象外）。ライブラリとの受け渡しなど、やむを得ない場合だけ、理由を書いた `biome-ignore` を付け、サーバーとブラウザで値が違いうることに注意して使う
- 時刻には、グローバルの `Temporal` を使う。`import { Temporal } from 'temporal-polyfill'` とは書かない（`pnpm run check` が確かめる。ブラウザでは、各アプリの `instrumentation-client.ts` が `temporal-polyfill/global` を読み込む）
- テストで現在時刻を固定するときは、`vi.mock('temporal-polyfill')` ではなく `vi.spyOn(Temporal.Now, 'instant')` などを使う
- 現在の絶対時刻は `Temporal.Now.instant()` で取る
- API で送受信するときは ISO 8601 の文字列にする。`Temporal.Instant` の `toString()` は常に UTC。タイムゾーン付きの文字列が要る場合は `Temporal.ZonedDateTime` の `toString()` を使う
- タイムゾーンは直接書かず（`'Asia/Tokyo'` など）、`@shinju-date/constants` の `TIME_ZONE` を使う（`pnpm run check` が確かめる。テストのファイルは対象外）
- データベースの `TIMESTAMPTZ` のカラムに保存するときは、**必ず** `@shinju-date/temporal-fns` の `toDBString` を使う（`toString()` を直接使わない）

## admin の Server Action の認証

[理由と例](docs/coding-guidelines.md#admin-の-server-action-の認証)

- データを変更する Server Action は、**必ず** `@/lib/action` のラッパーで作る（認証を入力値の検証や外部 API の呼び出しより前に確かめ、未認証なら `handler` を呼ばずに共通のレスポンスを返す）
  - `ActionResult`（`{ success, error }`）を返す Action: `adminAction(name, handler)`
  - `FormState` を返す Action（`useActionState` 用）: `adminFormAction(name, schema, handler)`
- 画面に見せてよい失敗は `ActionError` を投げる。それ以外の例外の文は画面に返さない（ラッパーが記録し、決まった文を返す）
- Supabase のクライアントは `handler` に渡される `supabaseClient` を使う（`createSupabaseServerClient()` を別に呼ばない）
- サービスロールキーのクライアント（`@/lib/supabase/admin`）や Redis を使う Action は RLS で守られないので、特に忘れない
- Action は `_actions/` に置く。`app/(dashboard)/` の `_actions/` のモジュールが公開する関数は、`apps/admin/app/(dashboard)/_lib/server-actions-auth.test.ts` の対象に自動でなり、未認証のときに副作用がないことを確かめられる（`_actions/` の外に `'use server'` のファイルを置くと、このテストが失敗する）

## 管理者のロールと RLS

[理由と例](docs/coding-guidelines.md#管理者のロールと-rls)

- 「Supabase Auth にログインできる = 管理者」ではない。管理者は `app_metadata.role` が `admin` のユーザー（`apps/admin/lib/admin-user.ts` の `isAdminUser()`、データベースでは `public.is_admin()`）
- `requireAuthenticatedUser()` と `proxy.ts` は、管理者のロールを持たないユーザーを未認証として扱う
- 管理画面向けの RLS のポリシーは、`TO "authenticated"` に加えて、**必ず** `(SELECT "public"."is_admin"())` を条件にする（`USING (true)` は使わない）。`supabase/tests/database/admin_role.test.sql` が検査する
- `SECURITY DEFINER` の関数は RLS を迂回するので、関数の中で `public.is_admin()` を確かめる
- ポリシーの名前は「`<テーブル>: admins can <操作>`」「`<テーブル>: anyone can <操作>`」、インデックスの名前は `idx_<テーブル>_<列>` にする（`supabase/tests/database/naming.test.sql` が検査する）

## MSW による認証の模擬

[詳しい説明](docs/msw-guide.md#管理画面の認証の模擬)

- `apps/admin` は、`ENABLE_MSW=true` に加えて `MSW_SUPABASE_AUTHENTICATED=true` を設定すると、ログインしなくても管理者のモックのユーザー（`admin@example.com`）として扱われる。ログアウトしても認証済みのままなので、ログイン画面を確かめるときは設定しない
- 設定しない場合は、ログインフォームに `admin@example.com` / `password123` を入れてログインする

## コミットとプルリクエスト

- コミットメッセージとプルリクエストのタイトルは、[Conventional Commits の形式](CONTRIBUTING.md#コミットメッセージ)の平易な英語で書く（例: `feat(web): add new feature`、`fix(admin): resolve API issue`）
- スコープは `apps/*` と `packages/*` のアプリやパッケージを単位にする
- [プルリクエスト](CONTRIBUTING.md#pull-request-のフロー)のタイトルはそのままコミットメッセージになるので、日本語を使わず、GitHub の UI に収まる1行にする
- 大きな変更は小さなコミットに分ける
- セッションの URL など、ほとんどの人が開けない URL を、コミットメッセージとプルリクエストに書かない。ハーネスがトレーラー（`Claude-Session:` など）や本文の末尾に付けるものも消す（[理由と確かめ方](CONTRIBUTING.md#コミットメッセージ)。プルリクエストごとにワークフローが確かめる）
