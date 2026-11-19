import preview from "#.storybook/preview";

import { Card, CardContent, CardHeader } from "./card";

const meta = preview.meta({
  argTypes: {
    variant: {
      control: "select",
      options: ["default"],
    },
  },
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Components/Card",
});

export const Default = meta.story({
  args: {
    children: (
      <>
        <CardHeader>
          <h3 className="text-body leading-normal font-semibold">Card Title</h3>
        </CardHeader>
        <CardContent>
          <p>This is the card content area. You can place any content here.</p>
        </CardContent>
      </>
    ),
    variant: "default",
  },
});

export const VideoCard = meta.story({
  args: {
    children: (
      <>
        <div className="aspect-video w-full bg-border" />
        <CardHeader>
          <h3 className="line-clamp-2 text-body leading-normal font-semibold">
            Sample Video Title
          </h3>
        </CardHeader>
        <CardContent>
          <p className="text-meta text-muted">Talent Name</p>
          <p className="text-meta text-muted tabular-nums">
            1.2M views • 2 days ago
          </p>
        </CardContent>
      </>
    ),
    style: { width: "320px" },
    variant: "default",
  },
});
