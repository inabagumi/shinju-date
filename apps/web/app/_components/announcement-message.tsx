import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeExternalLinks from "rehype-external-links";
import remarkGfm from "remark-gfm";

import type { Announcement } from "@/lib/data/announcements";

/**
 * お知らせを、バナー（クライアントコンポーネント）に渡す形にしたもの。
 * 本文はサーバーでレンダリングした React の要素にしてあり、Markdown の
 * 文字列は含めない。これにより、Markdown のパーサーをブラウザに配信せずに済む。
 */
export interface RenderedAnnouncement {
  id: Announcement["id"];
  level: Announcement["level"];
  message: ReactNode;
}

/**
 * お知らせの本文（Markdown）をレンダリングするサーバーコンポーネント。
 * 生の HTML はレンダリングしない（`react-markdown` の既定のまま）。
 */
export const AnnouncementMessage = ({ children }: { children: string }) => (
  <ReactMarkdown
    rehypePlugins={[
      [
        rehypeExternalLinks,
        {
          rel: ["nofollow", "noopener", "noreferrer"],
          target: "_blank",
        },
      ],
    ]}
    remarkPlugins={[remarkGfm]}
  >
    {children}
  </ReactMarkdown>
);

export const renderAnnouncement = (
  announcement: Announcement
): RenderedAnnouncement => ({
  id: announcement.id,
  level: announcement.level,
  message: <AnnouncementMessage>{announcement.message}</AnnouncementMessage>,
});
