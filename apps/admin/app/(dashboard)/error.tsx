"use client";

import * as Sentry from "@sentry/nextjs";
import { Button, PageHeader } from "@shinju-date/ui";
import Link from "next/link";
import { useEffect } from "react";

interface DashboardErrorProps {
  error: unknown;
  retry: () => void;
}

/**
 * Shown in place of a page whose data could not be loaded. The navigation
 * bar in the layout stays, so admins can move to another page or retry.
 */
export default function DashboardError({ error, retry }: DashboardErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const digest =
    error instanceof Error &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : null;

  return (
    <div>
      <PageHeader title="ページを表示できませんでした" />

      <div className="max-w-text space-y-6" role="alert">
        <p className="text-body">
          データの読み込み中にエラーが発生しました。時間をおいて再試行してください。
        </p>

        {digest && (
          <p className="text-meta text-muted">
            エラーID: <code className="font-mono">{digest}</code>
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => retry()}>再試行</Button>
          <Button asChild variant="secondary">
            <Link href="/">ダッシュボードに戻る</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
