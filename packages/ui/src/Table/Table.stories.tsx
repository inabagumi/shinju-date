import { expect, within } from "storybook/test";

import preview from "#.storybook/preview";

import { Badge } from "../Badge/Badge";
import { EmptyState } from "../EmptyState/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./Table";

const meta = preview.meta({
  component: Table,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  title: "Components/Table",
});

interface Video {
  duration: string;
  id: string;
  publishedAt: string;
  status: "公開中" | "削除済み" | "非表示";
  title: string;
}

const videos: Video[] = [
  {
    duration: "1:02:15",
    id: "1",
    publishedAt: "2026/11/14 21:00",
    status: "公開中",
    title: "【雑談】週末のおしゃべり配信",
  },
  {
    duration: "0:12:48",
    id: "2",
    publishedAt: "2026/11/13 19:30",
    status: "非表示",
    title: "【歌ってみた】オリジナル曲のカバー",
  },
  {
    duration: "3:45:00",
    id: "3",
    publishedAt: "2026/11/12 22:00",
    status: "削除済み",
    title: "【ゲーム実況】長時間の耐久配信",
  },
];

const statusVariants = {
  公開中: "success",
  削除済み: "danger",
  非表示: "neutral",
} as const satisfies Record<Video["status"], string>;

export const Default = meta.story({
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("table")).toBeInTheDocument();
    await expect(canvas.getAllByRole("columnheader")).toHaveLength(4);
    await expect(canvas.getAllByRole("row")).toHaveLength(videos.length + 1);
  },
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>タイトル</TableHead>
          <TableHead>公開日時</TableHead>
          <TableHead className="text-right">再生時間</TableHead>
          <TableHead>状態</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {videos.map((video) => (
          <TableRow key={video.id}>
            <TableCell>{video.title}</TableCell>
            <TableCell className="text-muted tabular-nums">
              {video.publishedAt}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {video.duration}
            </TableCell>
            <TableCell>
              <Badge variant={statusVariants[video.status]}>
                {video.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
});

export const Wrapping = meta.story({
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>用語</TableHead>
          <TableHead>読み</TableHead>
          <TableHead>説明</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>配信</TableCell>
          <TableCell className="text-muted">はいしん</TableCell>
          <TableCell className="whitespace-normal">
            既定では折り返さないセルも、`whitespace-normal`
            を指定すると長い文章を折り返して表示できます。
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
});

export const Overflow = meta.story({
  render: () => (
    <div className="max-w-sm">
      <Table>
        <TableHeader>
          <TableRow>
            {["タイトル", "チャンネル", "公開日時", "再生時間", "状態"].map(
              (label) => (
                <TableHead key={label}>{label}</TableHead>
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {videos.map((video) => (
            <TableRow key={video.id}>
              <TableCell>{video.title}</TableCell>
              <TableCell>SHINJU DATE チャンネル</TableCell>
              <TableCell className="tabular-nums">
                {video.publishedAt}
              </TableCell>
              <TableCell className="tabular-nums">{video.duration}</TableCell>
              <TableCell>{video.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
});

export const Empty = meta.story({
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>タイトル</TableHead>
          <TableHead>公開日時</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={2}>
            <EmptyState title="動画がありません" />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
});
