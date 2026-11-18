import type { Tables } from "@shinju-date/database";
import { Badge } from "@shinju-date/ui";

// Get level badge variant
const getLevelBadgeVariant = (level: string): "info" | "warning" | "danger" => {
  switch (level) {
    case "warning": {
      return "warning";
    }
    case "alert": {
      return "danger";
    }
    default: {
      return "info";
    }
  }
};

// Get level label
const getLevelLabel = (level: string): string => {
  switch (level) {
    case "warning": {
      return "警告";
    }
    case "alert": {
      return "重要";
    }
    default: {
      return "情報";
    }
  }
};

// Check if announcement is currently active
const isActive = (announcement: Tables<"announcements">): boolean => {
  if (!announcement.enabled) return false;

  const now = Temporal.Now.instant();
  const start = Temporal.Instant.from(announcement.start_at);
  const end = Temporal.Instant.from(announcement.end_at);

  return (
    Temporal.Instant.compare(now, start) >= 0 &&
    Temporal.Instant.compare(now, end) <= 0
  );
};

export const LevelBadge = ({ level }: { level: string }) => (
  <Badge variant={getLevelBadgeVariant(level)}>{getLevelLabel(level)}</Badge>
);

export const StatusBadge = ({
  announcement,
}: {
  announcement: Tables<"announcements">;
}) =>
  isActive(announcement) ? (
    <Badge variant="success">公開中</Badge>
  ) : announcement.enabled ? (
    <Badge variant="neutral">公開予定</Badge>
  ) : (
    <Badge variant="neutral">無効</Badge>
  );
