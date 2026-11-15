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

詳しい書き方は [coding-guidelines.md](coding-guidelines.md#セマンティックカラー) を参照してください。

### タレントのテーマカラー

タレントのテーマカラー（`talents.theme_color`、`#RRGGBB`）は、**配信スケジュール（`/schedule`）の予定の項目の左端の線にだけ**使います。スケジュールにはサムネイルを出さないので、「色はサムネイルに担わせる」の役をテーマカラーに持たせ、同じタレントの配信を1週間の中で色で追えるようにしています。

- **文字のない印にだけ使う。** 任意の色なので、文字の色や文字の地にすると、ライトとダークのどちらかでコントラスト比 4.5:1 を満たせません。文字は今までどおり `text-foreground` / `text-muted` にします
- **値は CSS 変数として `style` で渡し、クラスからその変数を参照する。** `dark:` は書きません。`#RRGGBB` の形でない値は `apps/web/lib/theme-color.ts` の `parseThemeColor` で未設定として扱います
- **未設定のタレントは `border-border` の色にする**
- **色だけに頼らない。** タレント名とアイコンを必ず出します。配信中は色ではなく「配信中」の文字つきの印（`bg-live`）で示し、ピンク系のテーマカラーと取り違えないようにします
- タレント一覧、タレントのページ、動画カードなど、ほかの画面にはまだ使いません

### 予定の項目（配信スケジュール）

配信スケジュールの1件は、共通の動画カードではなく専用の項目（`apps/web/app/schedule/_components/schedule-item.tsx`）で表示します。スケジュールで知りたいのは「いつ・誰が」なので、サムネイルは出しません。リンクの挙動（リンク先、`ping`、別タブ）は動画カードと同じです。

| 部分           | クラス                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 項目（リンク） | `block rounded-control border-l-4 py-1.5 pr-1 pl-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent` |
| 左端の線       | `border-l-(--talent-color)`（`style` で `--talent-color` を渡す）／未設定や形が違う値は `border-l-border`                                              |
| 1行目          | 開始時刻 `text-meta font-bold tabular-nums`。配信中だけ横に `LiveNow`（`bg-live` の「配信中」）、Twitch は `PlatformBadge`                             |
| 2行目          | タレントのアイコン（`TalentIcon`、20px）と名前 `truncate text-caption text-muted`                                                                      |
| 3行目          | タイトル `line-clamp-2 text-meta`（`title` 属性に全文）                                                                                                |

- 終了済みと予定には印を付けません。配信中だけ「配信中」の文字の印を出します
- 1024px 以上では、左に時刻の列、右に7日の列を並べ、1時間を一定の高さ（64px）にした24時間の軸に置きます。項目は開始時刻の位置に、長さぶんの高さで置きます。長さは、配信済み・公開済みは動画の長さ、配信前・配信中は1時間です。短い動画も読めるよう30分ぶんの高さは取り、日をまたぐぶんはその日の24時で切ります
- 時間が重なる項目は、重なる範囲で列の幅を分け合って横に並べます。3件以上重なるときはアイコンと左の線だけにし、タレント名とタイトルは `aria-label` に入れます。配信中は「配信中」の文字を残します
- 項目にマウスを乗せるかフォーカスすると、その項目を前面に出し、日の列の幅いっぱいに広げて中身をすべて出します。重なって出るので `shadow-overlay` を付けます
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

| 役割                               | クラス                                   | サイズ             | 太さ | 行間 |
| ---------------------------------- | ---------------------------------------- | ------------------ | ---- | ---- |
| ページ見出し（h1）                 | `text-title font-bold md:text-display`   | 24px（PC は 32px） | 700  | 1.4  |
| セクション見出し（h2）             | `text-heading font-bold`                 | 20px               | 700  | 1.4  |
| カードのタイトル・小見出し         | `text-body leading-normal font-semibold` | 16px               | 600  | 1.5  |
| 本文                               | `text-body`                              | 16px               | 400  | 1.7  |
| 補助情報（日時・タレント名・説明） | `text-meta text-muted`                   | 14px               | 400  | 1.6  |
| バッジ・注記                       | `text-caption font-semibold`             | 12px               | 600  | 1.4  |

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

- **時刻・再生時間・件数は `tabular-nums` にする。** 桁がそろい、数字が変わっても幅が揺れません
- **文章の行長は1行40〜45文字程度に抑える。** 説明文やお知らせなど、まとまった文章は `max-w-text`（44rem）の中に置きます

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

## 新しい画面を作るとき

- [ ] 色はセマンティックカラーで指定し、`dark:` で手書きしていない
- [ ] 紫は要所（リンク・選択中・主ボタン・フォーカス・フッター）だけ、ピンクは配信中だけに使っている
- [ ] 見出し・本文・補助情報に、上の[役割ごとの組み合わせ](#役割ごとの組み合わせ)を使っている
- [ ] 時刻・再生時間・件数に `tabular-nums` を付けている
- [ ] 角丸は `rounded-control` / `rounded-container` / `rounded-full` のいずれか
- [ ] 影は重なるものだけに `shadow-overlay` を使っている
- [ ] `packages/ui` にある部品（Button・Badge・Card・Dialog・Input・Select・Table・PageHeader・EmptyState・StatTile・FilterBar など）を使っている
- [ ] Badge の色は状態の意味で選んでいる（成功は `success`、注意は `warning`、危険は `danger`、中立は `neutral`）
