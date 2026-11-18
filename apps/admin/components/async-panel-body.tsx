"use client";

import { Alert, Button } from "@shinju-date/ui";
import { useTransition } from "react";
import type { ReactNode } from "react";

interface AsyncPanelBodyProps {
  /** 最後に取得できたデータで描いた中身。取り直しに失敗しても、そのまま出す */
  children: ReactNode;
  /** 取り直しが失敗した理由（`usePolledResource` の `error`） */
  error: string | null;
  /** 「再試行」で呼ぶ、取り直しの関数（`usePolledResource` の `reload`） */
  onRetry: () => Promise<void>;
}

/**
 * 一定の間隔で取り直すパネルの中身。取り直しに失敗したら、その理由と「再試行」の
 * ボタンを中身の上に出す
 */
export const AsyncPanelBody = ({
  children,
  error,
  onRetry,
}: AsyncPanelBodyProps) => {
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {error && (
        <Alert
          action={
            <Button
              disabled={isPending}
              onClick={() => startTransition(onRetry)}
              size="sm"
              variant="secondary"
            >
              再試行
            </Button>
          }
          className="mb-4"
          tone="danger"
        >
          {error}
        </Alert>
      )}
      {children}
    </>
  );
};
