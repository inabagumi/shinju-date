import type { Tables } from "@shinju-date/database";
import { Badge, twMerge } from "@shinju-date/ui";

export type Platform = Tables<"videos">["platform"];

/** プラットフォームの表示名。管理画面では、この定義だけを使う */
export const PLATFORM_LABELS: Record<Platform, string> = {
  twitch: "Twitch",
  youtube: "YouTube",
};

/** Twitch はブランドカラーの地（`bg-twitch`）、YouTube は中立の色にする */
const PLATFORM_CLASS_NAMES: Partial<Record<Platform, string>> = {
  twitch: "border-transparent bg-twitch text-twitch-foreground",
};

interface PlatformBadgeProps {
  platform: Platform;
  className?: string;
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const text = PLATFORM_LABELS[platform] ?? platform;

  return (
    <Badge
      className={twMerge(PLATFORM_CLASS_NAMES[platform], className)}
      variant="neutral"
    >
      {text}
    </Badge>
  );
}
