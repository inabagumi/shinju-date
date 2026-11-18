import { twMerge } from "@shinju-date/ui";
import ReactMarkdown from "react-markdown";
import rehypeExternalLinks from "rehype-external-links";
import remarkGfm from "remark-gfm";

/** `prose` の色を両モードのセマンティックカラーに合わせる */
const proseClassName =
  "prose max-w-text text-foreground [--tw-prose-body:var(--color-foreground)] [--tw-prose-bold:var(--color-foreground)] [--tw-prose-bullets:var(--text-color-muted)] [--tw-prose-code:var(--color-foreground)] [--tw-prose-counters:var(--text-color-muted)] [--tw-prose-headings:var(--color-foreground)] [--tw-prose-hr:var(--color-border)] [--tw-prose-links:var(--color-accent)] [--tw-prose-quote-borders:var(--color-border)] [--tw-prose-quotes:var(--color-foreground)]";

export interface MarkdownProps {
  /** Markdown の本文 */
  children: string;
  className?: string;
  /** 文字の大きさ。表の中など、狭い場所では `sm` にする */
  size?: "base" | "sm";
}

/**
 * Markdown の本文。GFM（表、取り消し線など）に対応し、リンクは新しいタブで開く。
 * 生の HTML はレンダリングしない（`react-markdown` の既定のまま）。
 */
export function Markdown({
  children,
  className,
  size = "base",
}: MarkdownProps) {
  return (
    <div
      className={twMerge(
        proseClassName,
        size === "sm" && "prose-sm",
        className
      )}
    >
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
    </div>
  );
}
