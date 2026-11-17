# デザインガイドライン

公開サイト（`apps/web`）と管理画面（`apps/admin`）の見た目の決まりです。新しい画面や部品を作るときは、このガイドラインに沿ってください。

値は [`packages/tailwind-config/theme.css`](../packages/tailwind-config/theme.css) で定義していて、両方のアプリと `packages/ui` が同じ値を使います。見本は Storybook の「Design System」で確認できます。

## 方針

方針と決めた値の経緯は [#6799](https://github.com/inabagumi/shinju-date/issues/6799) にまとめています。要点は次のとおりです。

**サムネイルが主役の、静かな紫**

1. **地は無彩色に近づける。** 色はサムネイルに担わせる
2. **紫は要所だけ。** リンク、選択中の状態、主ボタン、フォーカス、フッターに限る
3. **ピンクは「配信中」専用。** ホバーや現在地の表示には使わない
4. **ライトとダークは同じ設計の明暗違いにする。** 色は意味で名付けた変数で指定し、`dark:` で手書きしない
5. **装飾を減らす。** カードの背景・枠線・影に頼らず、余白と文字の強弱で区切る。影は重なるものだけに使う
6. **型を1つにする。** ページ見出し、動画カード、表、空状態はそれぞれ1種類の部品にする
7. **公開サイトと管理画面で同じ土台を使う。** 管理画面の主色も紫に揃える

## 色

色は用途で名付けたセマンティックカラーで指定します。ライトとダークの値は `theme.css` で切り替わるので、1つのクラスを書くだけで両モードに対応できます。値の一覧は `theme.css` と Storybook の「Design System/Colors」を参照してください。

| クラス                                   | 用途                                                                |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `bg-background`                          | ページの地                                                          |
| `text-foreground`                        | 本文・見出し                                                        |
| `bg-surface`                             | ヘッダー・モーダル・メニュー・入力欄                                |
| `bg-muted`                               | スケルトン・ホバー・表の見出し行                                    |
| `text-muted`                             | 補助情報（日時・タレント名・説明）                                  |
| `border-border`                          | 区切り線・入力欄の枠                                                |
| `bg-accent` / `text-accent`              | リンク・選択中・主ボタン・フォーカス                                |
| `text-accent-foreground`                 | `bg-accent` の上の文字                                              |
| `bg-primary` / `text-primary-foreground` | ブランドの地（フッター）と、その上の文字                            |
| `bg-live` / `text-live-foreground`       | 配信中（バッジの地と、その上の文字）。ほかには使わない              |
| `bg-twitch` / `text-twitch-foreground`   | Twitch の動画を示すバッジ。ブランドカラーなので値や透明度を変えない |
| `danger` / `success` / `warning`         | 状態（エラー・成功・警告）                                          |

- 状態の表示は、状態色の文字と同じ色の 10% の地（`bg-danger/10 text-danger` など）にする
- `gray-*` / `zinc-*` / `slate-*` などの Tailwind の標準色や、`774-*` の色見本は部品で直接使わない
- 文字と地のコントラスト比は 4.5:1 以上にする。組み合わせは `packages/ui/src/colors.test.ts` で確認している
- 新しいセマンティックカラーを `theme.css` に足すときは、カラーコードを直接書かず、`774-*` の色見本や Tailwind の標準色を `var()` で参照する

```tsx
// ✅ 1つのクラスでライトとダークの両方に対応
<div className="border border-border bg-surface">
  <p className="text-foreground">本文</p>
  <p className="text-muted">説明文</p>
</div>

// ✅ 状態色の文字と、同じ色の 10% の地
<div className="border border-danger/30 bg-danger/10 text-danger">
  エラーが発生しました
</div>

// ❌ dark: で色を手書きしない
<div className="border-gray-300 bg-white dark:border-zinc-700 dark:bg-zinc-800">
  <p className="text-gray-900 dark:text-zinc-100">本文</p>
</div>
```

### タレントのテーマカラー

タレントのテーマカラー（`talents.theme_color`、`#RRGGBB`）は、**配信スケジュール（`/schedule`）の予定の項目の左端の線にだけ**使います。スケジュールにはサムネイルを出さないので、「色はサムネイルに担わせる」の役をテーマカラーに持たせ、同じタレントの配信を1週間の中で色で追えるようにしています。

- **文字のない印にだけ使う。** 任意の色なので、文字の色や文字の地にすると、ライトとダークのどちらかでコントラスト比 4.5:1 を満たせません。文字は今までどおり `text-foreground` / `text-muted` にします
- **値は CSS 変数として `style` で渡し、クラスからその変数を参照する。** `dark:` は書きません。`#RRGGBB` の形でない値は `apps/web/lib/theme-color.ts` の `parseThemeColor` で未設定として扱います
- **未設定のタレントは `border-border` の色にする**
- **色だけに頼らない。** タレント名とアイコンを必ず出します。配信中は色ではなく「配信中」の文字つきの印（`bg-live`）で示し、ピンク系のテーマカラーと取り違えないようにします
- タレント一覧、タレントのページ、動画カードなど、ほかの画面にはまだ使いません

### 予定の項目（配信スケジュール）

配信スケジュールの1件は、共通の動画カードではなく専用の項目（`apps/web/app/schedule/_components/schedule-item.tsx`）で表示します。スケジュールで知りたいのは「いつ・誰が」なので、サムネイルは出しません。リンクの挙動（リンク先、`ping`、別タブ）は動画カードと同じです。

| 部分                     | クラス                                                                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 項目（リンク）           | `block rounded-control border border-l-4 border-border bg-surface py-1 pr-1 pl-2`。地と見分けられるよう枠を付ける。地は広げたときに下が透けないよう不透明にし、マウスを乗せても変えない                                               |
| 左端の線                 | `border-l-(--talent-color)`（`style` で `--talent-color` を渡す）／未設定や形が違う値は `border-l-border`                                                                                                                             |
| 1行目                    | 高さ 20px（`h-5`）に、タレントのアイコン（`TalentIcon`、20px）、開始時刻 `text-meta leading-5 font-bold tabular-nums`、配信中は `LiveNow`、Twitch は `PlatformBadge`、タレント名 `truncate text-caption text-muted` の順に並べる      |
| ラベルとハッシュタグの行 | 1行目とタイトルの間に `truncate text-caption text-muted`。動画カードと同じく、先頭のラベル1つと、ハッシュタグを先頭から3つまで（頭に `#`）を半角の空白で区切って並べる。内容がない項目では出さない。1024px 以上では広げたときだけ出す |
| タイトル                 | `text-meta`（`title` 属性に全文）。本文を出す。1024px 未満は2行まで、1024px 以上は項目の高さに収まる行数まで                                                                                                                          |

- 週は日曜始まり（日曜〜土曜）です。URL（`/schedule/YYYY-MM-DD`）と `canonical` は、その週の日曜の日付を指します
- 終了済みと予定には印を付けません。配信中だけ「配信中」の文字の印を出します
- 1024px 以上では、左に時刻の列、右に7日の列を並べ、1時間を一定の高さ（64px）にした24時間の軸に置きます。項目は開始時刻の位置に、長さぶんの高さで置きます。長さは、配信済み・公開済みは動画の長さ、配信前・配信中は1時間です。短い動画も読めるよう30分ぶんの高さは取り、日をまたぐぶんはその日の24時で切ります
- 時間が重なる項目は、重なる範囲で列の幅を分け合って横に並べます。幅が狭くても中身の並びは変えず、入りきらない部分を切ります。先頭にアイコンがあるので、狭くても誰の配信かがわかります。タイトルは行の途中で切れないよう、項目の高さに収まる行数だけ出します。ラベルとハッシュタグの行を出すと1時間の項目にタイトルが入らなくなるため、広げていない項目にはこの行を出さず、タイトルを優先します
- 項目にマウスを乗せるかフォーカスすると、その項目を前面に出し、左端はそのままに右へ広げます（日の列の右端まで。最低 14rem で、週の右端は越えない）。高さは中身に合わせて伸ばし、ラベルとハッシュタグの行とタイトルの全文を出します。並びは変わらないので、アイコンや1行目の位置はずれません。広げた項目は、重なって出るので項目そのものに `shadow-overlay` を付けます。地の色は変えません
- 日付の見出しは、スクロールしても見えるよう、サイトのヘッダーの下（`sticky top-14`）に固定します。広げた項目より前に出します
- 1024px 未満では日付ごとのセクションを縦に積み、上に曜日の帯（各日へのページ内リンク）を置きます。項目は開始時刻の順に縦に並べます
- 日付の見出しは `text-body font-semibold`、件数は `text-meta text-muted tabular-nums` です。今日は見出しの横に「今日」の文字の印（`text-caption font-semibold text-accent`）を付けます

## 文字

### フォント

欧文は Lato、日本語は端末のフォント（ヒラギノ角ゴ、BIZ UDPゴシック、メイリオなど）を使います。`theme.css` の `--font-sans` で指定しています。

**日本語のウェブフォントは使いません。** 日本語のフォントはファイルが大きく、読み込みを待つと表示が遅れ、読み込み後に字形が切り替わるとレイアウトシフトが起きるためです。これは意図した判断なので、日本語のウェブフォントを追加しないでください。

Lato は 300・400・700 を読み込んでいます（Lato には 600 がありません）。600（`font-semibold`）を指定した欧文は、ブラウザが近い 700 で表示します。

### 文字サイズ

文字サイズは6段階です。`theme.css` で、サイズと行間を組にしたクラスとして定義しています。

| クラス         | サイズ / 行間 | 使う場所                                               |
| -------------- | ------------- | ------------------------------------------------------ |
| `text-display` | 32px / 1.4    | PC のページ見出し                                      |
| `text-title`   | 24px / 1.4    | ページ見出し                                           |
| `text-heading` | 20px / 1.4    | セクション見出し                                       |
| `text-body`    | 16px / 1.7    | 本文。カードのタイトルでは `leading-normal` を併用する |
| `text-meta`    | 14px / 1.6    | 補助情報（日時・タレント名・説明）                     |
| `text-caption` | 12px / 1.4    | バッジ・注記                                           |

`text-xs` や `text-sm` などの Tailwind の標準のサイズは、新しく書く部分では使いません。

### 役割ごとの組み合わせ

| 役割                                          | クラス                                   | サイズ             | 太さ                | 行間 |
| --------------------------------------------- | ---------------------------------------- | ------------------ | ------------------- | ---- |
| ページ見出し（h1）                            | `text-title font-bold md:text-display`   | 24px（PC は 32px） | 700                 | 1.4  |
| セクション見出し（h2）                        | `text-heading font-bold`                 | 20px               | 700                 | 1.4  |
| パネルの見出し（管理画面の `Panel` の h2）    | `text-heading font-bold`                 | 20px               | 700                 | 1.4  |
| カードのタイトル・小見出し                    | `text-body leading-normal font-semibold` | 16px               | 600                 | 1.5  |
| 本文                                          | `text-body`                              | 16px               | 400                 | 1.7  |
| 補助情報（日時・タレント名・説明）            | `text-meta text-muted`                   | 14px               | 400                 | 1.6  |
| バッジ・注記                                  | `text-caption font-semibold`             | 12px               | 600                 | 1.4  |
| 状態の知らせ（[`Alert`](#状態の知らせalert)） | `text-meta`（見出しは `font-semibold`）  | 14px               | 400（見出しは 600） | 1.6  |
| 入力欄（すべての大きさ）、大きいボタン        | `text-body leading-normal`               | 16px               | —                   | 1.5  |
| ボタン（標準と小）、メニューの項目、トースト  | `text-meta leading-5`                    | 14px               | —                   | 20px |

```tsx
const example = (
  <article>
    <h1 className="text-title font-bold md:text-display">タレント一覧</h1>
    <h2 className="text-heading font-bold">配信中</h2>
    <h3 className="text-body leading-normal font-semibold">動画のタイトル</h3>
    <p className="text-meta text-muted tabular-nums">2026/11/14 21:00</p>
  </article>
)
```

- **操作部品の行間は、本文より詰める。** ボタン・入力欄・メニューの項目・トーストは、1行で収まる前提で高さを決めているため、`text-body` / `text-meta` の行間（1.7 / 1.6）ではなく、上の表の `leading-normal` / `leading-5` を併用します。`packages/ui` の部品は、すでにこの組み合わせになっています
- **入力欄（`Input`・`Select`・`Textarea`）の文字は 16px 未満にしない。** iOS の Safari は、16px 未満の入力欄にフォーカスすると画面を拡大します。小さい入力欄（`inputSize="sm"`）も文字は 16px のままで、余白で小ささを出します
- **時刻・再生時間・件数は `tabular-nums` にする。** 桁がそろい、数字が変わっても幅が揺れません
- **文章の行長は1行40〜45文字程度に抑える。** 説明文やお知らせなど、まとまった文章は `max-w-text`（44rem）の中に置きます
- **管理画面の枠で囲んだ区画は `Panel`（`apps/admin/components/panel.tsx`）にする。** 枠（`rounded-container border border-border bg-surface p-6`）と見出し（`title`）、補足（`description`）、見出しの右の操作（`actions`）をまとめて持ちます。クラスの文字列を手で書かないでください。詳細ページの項目名と値の一覧は、`Panel` の中に `DetailList` と `DetailRow` で置きます

```tsx
const panel = (
  <Panel
    actions={<Button variant="secondary">編集</Button>}
    description="現在データベースに保存されている情報"
    title="タレント情報"
  >
    <DetailList>
      <DetailRow label="タレント名">{talent.name}</DetailRow>
    </DetailList>
  </Panel>
)
```

### 状態の知らせ（Alert）

削除済み・引退・失敗など、画面の中で状態を知らせる枠は、`@shinju-date/ui` の `Alert` を使います。色の付いた枠を手で書かないでください。

| 部分     | クラス・props                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 枠       | `rounded-container border p-4 text-meta text-foreground`。地と枠線は `tone` で決まる                                                                                                 |
| 見出し   | `title`。本文の上の太字の1行（`font-semibold`）                                                                                                                                      |
| 本文     | `children`                                                                                                                                                                           |
| 操作     | `action`。右端に置くリンクやボタン。狭い画面では本文の下に回る                                                                                                                       |
| 読み上げ | `role`。既定は `danger` と `warning` が `alert`、`success` と `neutral` が `status`。知らせではない枠（一覧や、危険な操作を分けて置く枠）は `role="region"` と `aria-label` を付ける |

`tone` は状態の意味で選びます。文字はどの `tone` でも `text-foreground` にし、色は地と枠線だけに使います（コントラスト比は `packages/ui/src/colors.test.ts` で確認しています）。

| `tone`    | 地と枠線                          | 使う場面                                   |
| --------- | --------------------------------- | ------------------------------------------ |
| `danger`  | `border-danger/30 bg-danger/10`   | 危険な状態（失敗、削除済み、操作のエラー） |
| `warning` | `border-warning/30 bg-warning/10` | 注意を促す状態（引退、確認が必要な操作）   |
| `success` | `border-success/30 bg-success/10` | 操作が済んだこと                           |
| `neutral` | `border-border bg-muted`          | どれにも当たらない知らせ（予定や補足）     |

```tsx
const example = (
  <Alert
    action={<Link href="/system#video-backfill-history">履歴を確認する</Link>}
    title="削除されたタレント"
    tone="danger"
  >
    このタレントは削除されています。
  </Alert>
)
```

### 操作の結果の知らせ（管理画面）

管理画面で Server Action を呼んだ結果は、操作した場所によって知らせ方を決めます。

| 操作した場所                                 | 知らせ方                                                         |
| -------------------------------------------- | ---------------------------------------------------------------- |
| 一覧の行・メニュー・ボタン                   | トースト                                                         |
| 確認ダイアログ（`ConfirmDialog`）            | 失敗はダイアログの中に出す。成功したら閉じて、トーストで知らせる |
| フォームの送信（`useActionState`）           | 入力欄の近くに出す                                               |
| 画面の状態（削除済み・引退・読み込みの失敗） | `Alert`（[状態の知らせ](#状態の知らせalert)）                    |

- フォームを使わずにアクションを呼ぶときは、`apps/admin/lib/use-server-action.ts` の `useServerAction` を使う。`useTransition` と try/catch を部品ごとに書かない
  - 成功なら `successText`、失敗なら `result.error`、`result.warnings` があれば1件ずつ警告のトーストを出す。例外のときは「処理に失敗しました。」を出す
  - 実行中の状態は `isPending` で受け取り、ボタンを無効にする
- トーストは、ルートのレイアウトに置いた `ActionToastProvider` が1か所で描く。部品から直接トーストを出すときは `useActionToast()` の `showToast` を使い、`<Toast>` を部品ごとに置かない
- トーストの色は、`success`（成功）、`warning`（成功したが一部に注意が要る）、`danger`（失敗）の3つ
- 成功のあとに `router.refresh()` を呼ばない。表示の更新は、アクションの `revalidatePath` に任せる

```tsx
const { isPending, run } = useServerAction(toggleVisibilityAction, {
  successText: '表示状態を更新しました。',
})

const button = (
  <Button disabled={isPending} onClick={() => run([video.id])}>
    表示を切り替える
  </Button>
)
```

### 動画カードのタイトル

動画のタイトルは、`@shinju-date/helpers` の `parseVideoTitle` で「本文・ラベル（【】と〖〗の中身）・末尾のハッシュタグ」に分けて表示します。【】の中の出演者の表記（所属の名前 `TALENT_AFFILIATION_NAME` を含む部分と、タレントの名前）は出しません。`title` 属性には元のタイトルを入れます。

| 部分                     | クラス                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ラベルとハッシュタグの行 | `<p>` に `truncate min-h-[1lh] text-caption text-muted`。タイトルの上に置く。先頭のラベル1つと、ハッシュタグを先頭から3つまで（頭に `#`）を半角の空白で区切って並べる |
| タイトル                 | `line-clamp-2 min-h-[2lh] text-body leading-normal font-semibold`。本文を出す                                                                                         |

- 内容がないカードでも、ラベルとハッシュタグの行の1行ぶんの高さを確保して、カードの高さを揃えます。スケルトンにも同じ高さの行を置きます
- カード全体が1つのリンクなので、ハッシュタグはリンクにしません
- ショートのカルーセル（`variant="short"`）では、ラベルとハッシュタグの行を出さず、タイトルに本文だけを出します
- ラベルとハッシュタグの行の文字は、`apps/web/lib/video-title.ts` の `getVideoTitleParts` で作ります。配信スケジュールの項目でも同じ関数を使います

### `twMerge` について

`theme.css` で追加した文字サイズ、角丸、影を `tailwind-merge` に登録した `twMerge` を、`@shinju-date/ui` から使ってください。`tailwind-merge` の `twMerge` は `text-body` などを文字色として扱うため、`twMerge('text-body text-foreground')` の `text-body` が消えてしまいます。`tailwind-merge` から直接インポートすると Biome のエラーになります。

```tsx
import { twMerge } from '@shinju-date/ui'
```

## 角丸

角丸は3種類です。値は `packages/tailwind-config/theme.css` で定義しています。

| 対象                                                 | クラス              |
| ---------------------------------------------------- | ------------------- |
| 操作部品（ボタン、入力欄、バッジ、メニュー項目）     | `rounded-control`   |
| 入れ物（サムネイル、モーダル、表、パネル、メニュー） | `rounded-container` |
| 丸（アバター、ピル）                                 | `rounded-full`      |

`rounded` / `rounded-sm` / `rounded-md` / `rounded-lg` / `rounded-xl` / `rounded-2xl` などの Tailwind の既定のクラスは使いません。メニューやお知らせのように、操作部品を並べた入れ物は `rounded-container`、その中の項目は `rounded-control` にします。角の一部だけを丸める場合も `rounded-t-container` のように同じ名前を使います。

## 影

- **通常の部品には影を使いません。** カードや表は、余白と `border` で区切ります。ホバーで影を付けることもしません
- **影は重なるものだけに使います。** 値は `packages/tailwind-config/theme.css` で定義しています

| 対象                                     | クラス           |
| ---------------------------------------- | ---------------- |
| モーダル、ドロップダウン、お知らせバナー | `shadow-overlay` |

固定ヘッダーには影を付けず、下端を `border` の線1本で区切ります。`shadow-sm` / `shadow-lg` などの Tailwind の既定のクラスは使いません。

アプリにはまだ Tailwind の既定の角丸と影のクラスが残っています。画面を作り直すときに、上の名前に置き換えてください。

## 濃淡の表

回数の分布を色の濃さで示す表（タレントのページの「配信の傾向」など）は、次の組み合わせにします。部品は `apps/web/app/talents/[id]/_components/talent-stream-tendency.tsx` です。

補助的な情報なので、主な内容（動画の一覧など）を押し下げないよう小さく作り、広い画面ではページ見出しの横に置きます。狭い画面では `<details>` で要点の1行（「土曜日・21時台が多い」など）に畳み、広い画面では `md:details-content:block md:details-content:[content-visibility:visible]` で常に開いて、`<summary>` は `supports-[selector(::details-content)]:md:hidden` で隠します（`::details-content` に対応していないブラウザーでは、開くための1行を残します）。

- 色は `accent` に固定する。タレントのテーマカラーなどの任意の色は、薄い段階を見分けられることをライトとダークの両方で保証できないので使わない
- 濃さは、その表でいちばん多いセルの回数（`max`）に対する割合で4段階に分ける

| 回数                                      | クラス         |
| ----------------------------------------- | -------------- |
| 0                                         | `bg-muted`     |
| 1 以上で `Math.ceil(回数 / max * 4)` が 1 | `bg-accent/25` |
| 同 2                                      | `bg-accent/50` |
| 同 3                                      | `bg-accent/75` |
| 同 4                                      | `bg-accent`    |

| 部分           | クラス・要素                                                                                                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 表             | 入れ物は `w-full max-w-84`（1マス約11px）。`<table>` に `w-full table-fixed border-separate border-spacing-0.5`。`<caption>` は `sr-only`                                                                                                                       |
| 行・列の見出し | `<th scope="row">` / `<th scope="col">` に `text-caption leading-none text-muted`（行の高さをマスに合わせる）。見せる文字（「月」「18」）は `aria-hidden`、読み上げる文字（「月曜日」「18時」）は `sr-only` で別に入れる。間引いた見出しは `sr-only` だけにする |
| セル           | `<td>` の中に `block aspect-square` と濃淡のクラス。角丸は付けない                                                                                                                                                                                              |
| セルの回数     | 数字は見せず、`sr-only` で「3回」のように入れる                                                                                                                                                                                                                 |

見せる文字に `sr-only` の文字を続けると、ブラウザーが間に空白を入れて「月 曜日」と読み上げるため、読み上げる文字はまとめて `sr-only` にします。

## 新しい画面を作るとき

- [ ] 色はセマンティックカラーで指定し、`dark:` で手書きしていない
- [ ] 紫は要所（リンク・選択中・主ボタン・フォーカス・フッター）だけ、ピンクは配信中だけに使っている
- [ ] 見出し・本文・補助情報に、上の[役割ごとの組み合わせ](#役割ごとの組み合わせ)を使っている
- [ ] 時刻・再生時間・件数に `tabular-nums` を付けている
- [ ] 角丸は `rounded-control` / `rounded-container` / `rounded-full` のいずれか
- [ ] 影は重なるものだけに `shadow-overlay` を使っている
- [ ] `packages/ui` にある部品（Button・Badge・Card・Dialog・Input・Select・Table・PageHeader・EmptyState・StatTile・FilterBar・Alert など）を使っている
- [ ] Badge の色と Alert の `tone` は状態の意味で選んでいる（成功は `success`、注意は `warning`、危険は `danger`、中立は `neutral`）
- [ ] 管理画面の操作の結果は、[操作の結果の知らせ](#操作の結果の知らせ管理画面)に沿って出している
