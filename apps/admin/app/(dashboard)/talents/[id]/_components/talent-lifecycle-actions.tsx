"use client";

import type { Tables } from "@shinju-date/database";
import { Button } from "@shinju-date/ui";

import { TalentLifecycleDialog } from "../../_components/talent-lifecycle-dialog";

type Talent = Pick<Tables<"talents">, "id" | "name" | "status" | "deleted_at">;

interface TalentLifecycleActionsProps {
  talent: Talent;
}

export const TalentLifecycleActions = ({
  talent,
}: TalentLifecycleActionsProps) => {
  const isDeleted = talent.deleted_at !== null;
  const isRetired = !isDeleted && talent.status === "retired";
  const isActive = !isDeleted && talent.status === "active";

  if (isDeleted) {
    return (
      <TalentLifecycleDialog
        operation="restore"
        talent={talent}
        trigger={<Button variant="primary">復活</Button>}
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-2 sm:justify-end">
      {isActive && (
        <TalentLifecycleDialog
          operation="retire"
          talent={talent}
          trigger={<Button variant="secondary">引退にする</Button>}
        />
      )}
      {isRetired && (
        <TalentLifecycleDialog
          operation="activate"
          talent={talent}
          trigger={<Button variant="secondary">アクティブに戻す</Button>}
        />
      )}
      <TalentLifecycleDialog
        operation="delete"
        talent={talent}
        trigger={<Button variant="danger">削除</Button>}
      />
    </div>
  );
};
