import preview from "#.storybook/preview";

import { Button } from "../Button/Button";
import { Alert } from "./Alert";

const meta = preview.meta({
  argTypes: {
    tone: {
      control: "select",
      options: ["danger", "warning", "success", "neutral"],
    },
  },
  component: Alert,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  title: "Components/Alert",
});

/** 失敗や削除済みなど、危険な状態の知らせ */
export const Danger = meta.story({
  args: {
    children: "この動画は削除されており、同期できません。",
    title: "削除された動画",
    tone: "danger",
  },
});

/** 引退や、確認が必要な操作など、注意を促す知らせ */
export const Warning = meta.story({
  args: {
    children: "このタレントは引退状態です。",
    title: "引退したタレント",
    tone: "warning",
  },
});

/** 操作が済んだことの知らせ */
export const Success = meta.story({
  args: {
    children: "メールアドレスの確認メールを送りました。",
    tone: "success",
  },
});

/** どれにも当たらない、中立の知らせ */
export const Neutral = meta.story({
  args: {
    children: "次の同期は 2026/11/16 21:00 に行われます。",
    tone: "neutral",
  },
});

export const WithAction = meta.story({
  args: {
    action: (
      <a className="font-semibold underline" href="#history">
        履歴を確認して再試行する
      </a>
    ),
    children: "過去動画の取り込みが失敗したアカウントが3件あります。",
    tone: "danger",
  },
});

export const WithButton = meta.story({
  args: {
    action: (
      <Button size="sm" variant="secondary">
        復活する
      </Button>
    ),
    children:
      "このタレントは削除されています。復活すると動画の復旧も行われます。",
    title: "削除されたタレント",
    tone: "danger",
  },
});

const TONES = [
  ["danger", "危険", "失敗や削除済みなど、危険な状態を知らせます。"],
  ["warning", "注意", "引退や、確認が必要な操作など、注意を促します。"],
  ["success", "成功", "操作が済んだことを知らせます。"],
  ["neutral", "中立", "どれにも当たらない知らせです。"],
] as const;

/**
 * 4つの `tone` を、ページの地（`bg-background`）とパネルの地（`bg-surface`）に
 * 並べる。ライトとダークの両方で本文のコントラスト比を確かめる
 */
export const AllTones = meta.story({
  parameters: {
    layout: "fullscreen",
  },
  render: () => (
    <div className="grid gap-px bg-border md:grid-cols-2">
      {(["bg-background", "bg-surface"] as const).map((ground) => (
        <div className={`flex flex-col gap-4 p-6 ${ground}`} key={ground}>
          <p className="text-caption text-muted">{ground}</p>
          {TONES.map(([tone, title, body]) => (
            <Alert key={tone} title={title} tone={tone}>
              {body}
            </Alert>
          ))}
        </div>
      ))}
    </div>
  ),
});
