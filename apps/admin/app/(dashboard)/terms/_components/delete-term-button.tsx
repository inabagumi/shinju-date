"use client";

import { Button } from "@shinju-date/ui";

import { ConfirmDialog } from "@/components/confirm-dialog";

import { deleteTermAction } from "../_actions";

interface DeleteTermButtonProps {
  id: string;
  /** 確認文に出す用語 */
  term: string;
}

/** 用語の一覧の、行ごとの削除のボタン。確認のダイアログを開いてから削除する */
export function DeleteTermButton({ id, term }: DeleteTermButtonProps) {
  return (
    <ConfirmDialog
      confirmLabel="削除"
      confirmVariant="danger"
      description={`本当に「${term}」を削除しますか？この操作は取り消せません。`}
      onConfirm={() => deleteTermAction(id)}
      title="用語を削除"
      trigger={
        <Button size="sm" variant="danger">
          削除
        </Button>
      }
    />
  );
}
