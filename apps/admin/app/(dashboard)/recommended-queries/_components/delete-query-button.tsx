"use client";

import { Button } from "@shinju-date/ui";

import { useActionToast } from "@/components/action-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";

import { deleteQueryAction } from "../_actions";

interface DeleteQueryButtonProps {
  query: string;
}

/**
 * 手動のおすすめクエリの、行ごとの削除のボタン。失敗はダイアログの中に出し、
 * 成功したらダイアログを閉じてトーストで知らせる
 */
export const DeleteQueryButton = ({ query }: DeleteQueryButtonProps) => {
  const { showToast } = useActionToast();

  const handleDeleteQuery = async () => {
    const result = await deleteQueryAction(query);

    if (result.success) {
      showToast("success", "クエリを削除しました。");
    }

    return result;
  };

  return (
    <ConfirmDialog
      confirmLabel="削除"
      confirmVariant="danger"
      description={`「${query}」を削除しますか？`}
      onConfirm={handleDeleteQuery}
      title="おすすめクエリを削除"
      trigger={
        <Button
          aria-label={`「${query}」を削除`}
          size="sm"
          type="button"
          variant="danger"
        >
          削除
        </Button>
      }
    />
  );
};
