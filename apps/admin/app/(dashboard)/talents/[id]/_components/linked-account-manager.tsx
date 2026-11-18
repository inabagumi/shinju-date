"use client";

import { EmptyState, Button as UIButton } from "@shinju-date/ui";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useActionToast } from "@/components/action-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { ActionResult } from "@/components/confirm-dialog";
import { ErrorMessage, FormField, Input, Label } from "@/components/form";
import type { FormState } from "@/components/form";
import { FormDialog } from "@/components/form-dialog";
import { Panel } from "@/components/panel";

/** 一覧に表示する、外部のサービスのアカウント1件 */
export interface LinkedAccount {
  /** データベースの行の ID。削除のアクションに渡す */
  id: string;
  /** 外部のサービスの API から取得した名前 */
  name: string | null;
  /** 外部のサービスでのアカウントの ID */
  serviceId: string;
  /** 外部のサービスでのハンドルやログイン名 */
  handle: string | null;
  /** 外部のサービスのページの URL。作れないときは `null` */
  url: string | null;
}

/** 追加のダイアログの入力欄 */
export interface LinkedAccountField {
  /** フォームの項目名。追加のアクションが `FormData` から読む */
  name: string;
  label: string;
  /** 入力欄の下に置く補足（入力の例など） */
  description: string;
  placeholder: string;
}

export interface LinkedAccountLabels {
  /** アカウントの種類（例: `YouTubeチャンネル`）。見出しや確認の文に使う */
  account: string;
  /** 追加のボタン */
  add: string;
  /** 追加のダイアログの説明 */
  addDescription: string;
  /** 一覧が空のときの文 */
  empty: string;
  /** 外部のサービスの名前（例: `YouTube`） */
  service: string;
  /** カードの項目名 */
  name: string;
  serviceId: string;
  handle: string;
}

/** `ChannelManager` などの、定義を渡すだけの部品が受け取るもの */
export interface LinkedAccountListProps<T> {
  talentId: string;
  accounts: T[];
  isDeleted: boolean;
}

export interface LinkedAccountManagerProps<
  T,
> extends LinkedAccountListProps<T> {
  labels: LinkedAccountLabels;
  field: LinkedAccountField;
  addAction: (
    currentState: FormState,
    formData: FormData
  ) => FormState | Promise<FormState>;
  removeAction: (accountId: string, talentId: string) => Promise<ActionResult>;
  /** 1件のアカウントを、一覧に表示する形にする */
  getAccount: (account: T) => LinkedAccount;
}

/**
 * タレントに紐づける、外部のサービスのアカウントの管理。
 * 追加のダイアログ、カードの一覧、削除の確認を持つ
 */
export function LinkedAccountManager<T>({
  talentId,
  accounts,
  isDeleted,
  labels,
  field,
  addAction,
  removeAction,
  getAccount,
}: LinkedAccountManagerProps<T>) {
  // Kept after the dialog closes so that its content stays while it fades out.
  const [removalTarget, setRemovalTarget] = useState<LinkedAccount | null>(
    null
  );
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const { showToast } = useActionToast();
  const removeLabel = `${labels.account}を削除`;

  // 失敗はダイアログの中に出し、成功したらダイアログを閉じてトーストで知らせる
  const handleRemove = async (accountId: string) => {
    const result = await removeAction(accountId, talentId);

    if (result.success) {
      showToast("success", `${labels.account}を削除しました。`);
    }

    return result;
  };

  return (
    <div>
      <Panel
        actions={
          !isDeleted && (
            <FormDialog
              action={addAction}
              description={labels.addDescription}
              submitLabel="追加"
              title={`${labels.account}を追加`}
              trigger={
                <UIButton type="button" variant="secondary">
                  <Plus aria-hidden="true" className="mr-2 size-4" />
                  {labels.add}
                </UIButton>
              }
            >
              <input name="talent_id" type="hidden" value={talentId} />
              <FormField name={field.name}>
                <Label>{field.label}</Label>
                <Input placeholder={field.placeholder} required />
                <p className="mt-1 text-caption text-muted">
                  {field.description}
                </p>
                <ErrorMessage />
              </FormField>
            </FormDialog>
          )
        }
        description={`タレントに紐づけられた${labels.account}の追加・削除`}
        title={`${labels.account}管理`}
      >
        {accounts.length > 0 ? (
          <div className="space-y-3">
            {accounts.map(getAccount).map((account) => (
              <div
                className="flex items-start justify-between gap-4 rounded-container border border-border p-4"
                key={account.id}
              >
                <div className="min-w-0 flex-1">
                  <div className="space-y-2">
                    <div>
                      <span className="text-caption font-semibold text-muted">
                        {labels.name}
                      </span>
                      <p className="mt-1 text-meta">
                        {account.name || "未取得"}
                      </p>
                      <p className="mt-1 text-caption text-muted">
                        {labels.service} APIから自動更新される{labels.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-caption font-semibold text-muted">
                        {labels.serviceId}
                      </span>
                      <code className="mt-1 block rounded-control bg-muted px-2 py-1 font-mono text-caption break-all">
                        {account.serviceId}
                      </code>
                    </div>
                    {account.handle && (
                      <div>
                        <span className="text-caption font-semibold text-muted">
                          {labels.handle}
                        </span>
                        <p className="mt-1 text-caption">{account.handle}</p>
                      </div>
                    )}
                    {account.url && (
                      <div>
                        <a
                          className="inline-flex items-center gap-1 text-meta text-accent hover:underline"
                          href={account.url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {labels.service}で開く
                          <ExternalLink aria-hidden="true" className="size-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                {!isDeleted && (
                  <UIButton
                    aria-label={removeLabel}
                    className="shrink-0 px-2"
                    onClick={() => {
                      setRemovalTarget(account);
                      setIsRemoveDialogOpen(true);
                    }}
                    size="sm"
                    title={removeLabel}
                    type="button"
                    variant="danger"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </UIButton>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState className="py-4" title={labels.empty} />
        )}
      </Panel>
      <ConfirmDialog
        confirmLabel="削除"
        confirmVariant="danger"
        description={`この${labels.account}を削除してもよろしいですか？\n関連する動画データは削除されません。`}
        onConfirm={() =>
          removalTarget ? handleRemove(removalTarget.id) : undefined
        }
        onOpenChange={setIsRemoveDialogOpen}
        open={isRemoveDialogOpen}
        title={removeLabel}
      >
        {removalTarget && (
          <>
            <p className="font-semibold">
              {removalTarget.name || removalTarget.handle || "未取得"}
            </p>
            <code className="mt-1 block font-mono text-caption break-all">
              {removalTarget.serviceId}
            </code>
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
