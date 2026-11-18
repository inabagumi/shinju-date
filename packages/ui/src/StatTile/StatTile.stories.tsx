import preview from "#.storybook/preview";

import { StatTile } from "./StatTile";

const meta = preview.meta({
  argTypes: {
    changeTone: {
      control: "select",
      options: ["neutral", "positive", "negative"],
    },
  },
  component: StatTile,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Components/StatTile",
});

export const Default = meta.story({
  args: {
    label: "動画の総数",
    value: "12,345",
  },
});

export const WithChange = meta.story({
  args: {
    change: "+0（前日比）",
    label: "タレント",
    value: "48",
  },
});

export const Positive = meta.story({
  args: {
    change: "+1,204（前日比）",
    changeTone: "positive",
    label: "検索回数",
    value: "8,912",
  },
});

/** 件数が増えても悪い変化なら `negative` にする */
export const Negative = meta.story({
  args: {
    change: "+3（前日比）",
    changeTone: "negative",
    label: "取り込みの失敗",
    value: "5",
  },
});

export const Grid = meta.story({
  parameters: {
    layout: "padded",
  },
  render: () => (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatTile label="動画の総数" value="12,345" />
      <StatTile change="+12（前日比）" label="公開中の動画" value="11,870" />
      <StatTile
        change="+1,204（前日比）"
        changeTone="positive"
        label="検索回数"
        value="8,912"
      />
      <StatTile
        change="+3（前日比）"
        changeTone="negative"
        label="取り込みの失敗"
        value="5"
      />
    </div>
  ),
});
