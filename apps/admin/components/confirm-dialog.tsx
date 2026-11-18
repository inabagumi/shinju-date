"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  Input,
  twMerge,
} from "@shinju-date/ui";
import type { ButtonProps } from "@shinju-date/ui";
import { useId, useState } from "react";
import type { ReactElement, ReactNode } from "react";

/**
 * `onConfirm` が返す処理の結果。
 *
 * TODO: Server Action の共通の戻り値の型（#7005）ができたら、そちらに置き換える。
 */
export interface ActionResult {
  success: boolean;
  error?: string | undefined;
}

/**
 * 確認ボタンが押されたときの処理。値を返さない関数と、`Promise` を返す関数
 * （`async` 関数）のどちらも渡せる
 */
export type ConfirmHandler =
  | (() => void)
  | (() => Promise<ActionResult | undefined>);

/** ダイアログの幅 */
export type ConfirmDialogSize = "md" | "lg";

const SIZE_CLASS_NAMES = {
  lg: "max-w-lg",
  md: undefined,
} as const satisfies Record<ConfirmDialogSize, string | undefined>;

type ConfirmResult = Awaited<ReturnType<ConfirmHandler>>;

/** `onConfirm` が例外を投げたときに表示するエラー */
export const CONFIRM_DIALOG_FALLBACK_ERROR = "処理に失敗しました。";

interface ConfirmDialogBaseProps {
  title: string;
  /** 確認文。改行（`\n`）はそのまま表示する */
  description: string;
  /** 操作の対象（チャンネル名など）を強調して示す内容 */
  children?: ReactNode | undefined;
  confirmLabel: string;
  confirmVariant?: ButtonProps["variant"] | undefined;
  /** 実行中の確認ボタンの文字。省略時は `confirmLabel` に「中...」を付けたもの */
  pendingLabel?: string | undefined;
  /**
   * 指定すると、この文字列（`DELETE` など）を入力するまで確認ボタンを押せない
   * 入力欄を出す
   */
  requireKeyword?: string | undefined;
  /**
   * ダイアログの幅。`md`（既定）は 450px、`lg` は動画の一覧など広い内容を出すとき
   * に使う。高さが画面に収まらない場合は、ダイアログの中でスクロールする
   */
  size?: ConfirmDialogSize | undefined;
  /**
   * 確認ボタンが押されたときに呼ばれる。
   *
   * - 値を返さない場合は、そのままダイアログを閉じる
   * - `Promise` を返す場合は、終わるまでダイアログを開いたままにして、両方のボタンを
   *   無効にする。`{ success: false, error }` が返ったらダイアログの中にエラーを表示して
   *   開いたままにし、成功か値を返さなかったら閉じる。例外が投げられたら
   *   「処理に失敗しました。」を表示する
   */
  onConfirm: ConfirmHandler;
}

interface ControlledConfirmDialogProps extends ConfirmDialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 開くためのボタン */
  trigger?: ReactElement | undefined;
}

interface UncontrolledConfirmDialogProps extends ConfirmDialogBaseProps {
  open?: undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** 開くためのボタン。開閉の状態は部品の中で持つ */
  trigger: ReactElement;
}

export type ConfirmDialogProps =
  | ControlledConfirmDialogProps
  | UncontrolledConfirmDialogProps;

const isPromiseLike = <T,>(value: unknown): value is PromiseLike<T> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as PromiseLike<T>).then === "function";

/**
 * ブラウザ標準の `confirm()` の代わりに使う確認ダイアログ。
 * キャンセルした場合は `onConfirm` を呼ばずに閉じる。
 */
export const ConfirmDialog = ({
  open: controlledOpen,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  confirmLabel,
  confirmVariant = "primary",
  pendingLabel,
  requireKeyword,
  size = "md",
  onConfirm,
}: ConfirmDialogProps) => {
  const keywordInputId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  // 開くたびに、前回のエラーとキーワードの入力を消す。開閉を外から決める場合も
  // 同じように消すため、`onOpenChange` ではなく `open` の変化で判定する
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setError(null);
      setKeyword("");
    }
  }

  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    // 実行中は閉じない
    if (isPending && !nextOpen) {
      return;
    }

    setOpen(nextOpen);
  };

  const isKeywordMatched =
    requireKeyword === undefined || keyword === requireKeyword;

  const waitForResult = async (pendingResult: PromiseLike<ConfirmResult>) => {
    setIsPending(true);

    try {
      const actionResult = await pendingResult;

      if (actionResult && !actionResult.success) {
        setError(actionResult.error ?? CONFIRM_DIALOG_FALLBACK_ERROR);
      } else {
        setOpen(false);
      }
    } catch {
      setError(CONFIRM_DIALOG_FALLBACK_ERROR);
    }

    setIsPending(false);
  };

  const handleConfirm = () => {
    if (isPending || !isKeywordMatched) {
      return;
    }

    setError(null);

    let result: ReturnType<ConfirmHandler>;

    try {
      result = onConfirm();
    } catch (error_) {
      // 値を返さない `onConfirm` は、これまでどおり例外があっても閉じる
      setOpen(false);
      throw error_;
    }

    if (!isPromiseLike<ConfirmResult>(result)) {
      setOpen(false);
      return;
    }

    void waitForResult(result);
  };

  const preventWhilePending = (event: Event) => {
    if (isPending) {
      event.preventDefault();
    }
  };

  const hasDetails = Boolean(children);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          className={twMerge("overflow-y-auto", SIZE_CLASS_NAMES[size])}
          onEscapeKeyDown={preventWhilePending}
          onInteractOutside={preventWhilePending}
        >
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription
            className={`whitespace-pre-line ${hasDetails ? "mb-4" : ""}`}
          >
            {description}
          </DialogDescription>
          {hasDetails && (
            <div className="mb-6 rounded-control border border-border bg-muted p-3 text-meta">
              {children}
            </div>
          )}
          {requireKeyword !== undefined && (
            <div className="mb-4">
              <label
                className="mb-2 block text-meta font-semibold text-danger"
                htmlFor={keywordInputId}
              >
                続行するには「{requireKeyword}」と入力してください
              </label>
              <Input
                autoComplete="off"
                disabled={isPending}
                id={keywordInputId}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={requireKeyword}
                value={keyword}
              />
            </div>
          )}
          {error && (
            <Alert className="mb-4" tone="danger">
              {error}
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button disabled={isPending} type="button" variant="secondary">
                キャンセル
              </Button>
            </DialogClose>
            <Button
              disabled={isPending || !isKeywordMatched}
              onClick={handleConfirm}
              type="button"
              variant={confirmVariant}
            >
              {isPending
                ? (pendingLabel ?? `${confirmLabel}中...`)
                : confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
