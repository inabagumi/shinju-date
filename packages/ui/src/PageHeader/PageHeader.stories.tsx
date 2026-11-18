import preview from "#.storybook/preview";

import { Button } from "../Button/Button";
import { PageHeader } from "./PageHeader";

const meta = preview.meta({
  component: PageHeader,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  title: "Components/PageHeader",
});

export const Default = meta.story({
  args: {
    title: "動画管理",
  },
});

export const WithDescription = meta.story({
  args: {
    description: "取り込んだ動画の公開状態を切り替えたり、削除したりできます。",
    title: "動画管理",
  },
});

export const WithActions = meta.story({
  args: {
    actions: (
      <>
        <Button variant="secondary">書き出す</Button>
        <Button>タレントを追加</Button>
      </>
    ),
    description: "登録されているタレントの一覧です。",
    title: "タレント管理",
  },
});
