import type { Enums } from "@shinju-date/database";
import { Badge } from "@shinju-date/ui";
import type { BadgeProps } from "@shinju-date/ui";

const VIDEO_KIND_LABELS: Record<Enums<"video_kind">, string> = {
  short: "ショート",
  standard: "通常",
};

const VIDEO_KIND_VARIANTS: Record<
  Enums<"video_kind">,
  BadgeProps["variant"]
> = {
  short: "info",
  standard: "neutral",
};

interface VideoKindBadgeProps {
  videoKind: Enums<"video_kind">;
  className?: string;
}

export function VideoKindBadge({ videoKind, className }: VideoKindBadgeProps) {
  const variant = VIDEO_KIND_VARIANTS[videoKind] ?? "neutral";
  const text = VIDEO_KIND_LABELS[videoKind] ?? videoKind;

  return (
    <Badge className={className} variant={variant}>
      {text}
    </Badge>
  );
}
