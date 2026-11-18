import { Inbox, SearchX } from "lucide-react";

import preview from "#.storybook/preview";

import { Button } from "../button/button";
import { Card } from "../card/card";
import { EmptyState } from "./empty-state";

const meta = preview.meta({
  component: EmptyState,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  title: "Components/EmptyState",
});

export const Default = meta.story({
  args: {
    title: "データがありません",
  },
});

export const WithDescription = meta.story({
  args: {
    description: "条件を変えるか、絞り込みを解除してください。",
    icon: <SearchX />,
    title: "条件に合う動画がありません",
  },
});

export const WithAction = meta.story({
  args: {
    action: <Button>お知らせを追加</Button>,
    description: "追加したお知らせは、公開サイトの上部に表示されます。",
    icon: <Inbox />,
    title: "お知らせはまだありません",
  },
});

export const InCard = meta.story({
  args: {
    icon: <Inbox />,
    title: "未読のフィードバックはありません",
  },
  render: (args) => (
    <Card>
      <EmptyState {...args} />
    </Card>
  ),
});
