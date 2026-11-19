import type { Tables } from "@shinju-date/database";
import { Badge } from "@shinju-date/ui";
import type { BadgeProps } from "@shinju-date/ui";

type TalentStatus = Tables<"talents">["status"];

interface TalentStatusInfo {
  deleted_at: string | null;
  status: TalentStatus;
}

const STATUS_LABELS: Record<TalentStatus, string> = {
  active: "アクティブ",
  retired: "引退",
};

const getBadgeVariant = (talent: TalentStatusInfo): BadgeProps["variant"] => {
  if (talent.deleted_at) {
    return "danger";
  }

  if (talent.status === "retired") {
    return "neutral";
  }

  return "success";
};

const getStatusText = (talent: TalentStatusInfo): string => {
  if (talent.deleted_at) {
    return "削除済み";
  }

  return STATUS_LABELS[talent.status] ?? talent.status;
};

interface TalentStatusBadgeProps {
  talent: TalentStatusInfo;
  className?: string;
}

export const TalentStatusBadge = ({
  talent,
  className,
}: TalentStatusBadgeProps) => (
  <Badge className={className} variant={getBadgeVariant(talent)}>
    {getStatusText(talent)}
  </Badge>
);
