"use client";

import type { Tables } from "@shinju-date/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shinju-date/ui";
import { EllipsisVertical } from "lucide-react";
import { useState } from "react";

import { useActionToast } from "@/components/action-toast";
import { useServerAction } from "@/lib/use-server-action";

import { syncTalentAccountsAction } from "../_actions/sync";
import {
  TalentLifecycleDialog,
  type TalentLifecycleOperation,
} from "./talent-lifecycle-dialog";

type Talent = Pick<Tables<"talents">, "id" | "name" | "status" | "deleted_at">;

interface TalentActionsProps {
  talent: Talent;
}

export function TalentActions({ talent }: TalentActionsProps) {
  const { isPending: isSyncPending, run: runSync } = useServerAction(
    syncTalentAccountsAction,
    {
      errorText: "同期に失敗しました。",
      successText: ({ data }) =>
        data?.message ??
        (data?.unchanged
          ? "アカウント情報は既に最新です。"
          : "アカウント情報を同期しました。"),
    }
  );
  // メニューは項目を押すと閉じて中身が消えるため、ダイアログはメニューの外に置き、
  // 開いている操作をここで持つ。閉じる途中も文言が変わらないよう、操作の種類は
  // 閉じても残す
  const [lifecycleDialog, setLifecycleDialog] = useState<{
    open: boolean;
    operation: TalentLifecycleOperation;
  }>({ open: false, operation: "delete" });
  // 一覧の行の中には結果を表示する場所がないため、トーストで知らせる
  const { showToast } = useActionToast();

  const isDeleted = talent.deleted_at !== null;
  const isRetired = !isDeleted && talent.status === "retired";
  const isActive = !isDeleted && talent.status === "active";

  const openLifecycleDialog = (operation: TalentLifecycleOperation) => {
    setLifecycleDialog({ open: true, operation });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`「${talent.name}」の操作`}
          disabled={isSyncPending}
        >
          <EllipsisVertical aria-hidden="true" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {isDeleted ? (
            <DropdownMenuItem onSelect={() => openLifecycleDialog("restore")}>
              復活
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => runSync(talent.id)}>
                同期
              </DropdownMenuItem>
              {isActive && (
                <DropdownMenuItem
                  onSelect={() => openLifecycleDialog("retire")}
                >
                  引退にする
                </DropdownMenuItem>
              )}
              {isRetired && (
                <DropdownMenuItem
                  onSelect={() => openLifecycleDialog("activate")}
                >
                  アクティブに戻す
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => openLifecycleDialog("delete")}
                variant="danger"
              >
                削除
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <TalentLifecycleDialog
        onOpenChange={(open) =>
          setLifecycleDialog((prev) => ({ ...prev, open }))
        }
        onSuccess={(text) => showToast("success", text)}
        open={lifecycleDialog.open}
        operation={lifecycleDialog.operation}
        talent={talent}
      />
    </>
  );
}
