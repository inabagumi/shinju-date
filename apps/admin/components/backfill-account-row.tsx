import { Skeleton, twMerge } from "@shinju-date/ui";
import Link from "next/link";
import type { ReactNode } from "react";

import { PLATFORM_LABELS } from "./platform-badge";
import type { Platform } from "./platform-badge";

interface BackfillAccountTalent {
  id: string;
  /** `null` は、名前を取得できなかったタレント */
  name: string | null;
}

interface BackfillAccountRowProps {
  /** 右端に置く、状態のバッジや日時 */
  aside: ReactNode;
  /** アカウント名の下に並べる、件数や日時の行 */
  children?: ReactNode;
  className?: string | undefined;
  /** 取り込みが失敗した理由 */
  error?: string | null | undefined;
  /** アカウント名。`null` は、削除されたアカウント */
  name: string | null;
  provider: Platform;
  /** 渡すと、アカウント名の前にタレントへのリンクを置く */
  talent?: BackfillAccountTalent | undefined;
}

/** 過去動画の取り込みの一覧の、アカウント1件ぶんの行（`<li>`） */
export function BackfillAccountRow({
  aside,
  children,
  className,
  error,
  name,
  provider,
  talent,
}: BackfillAccountRowProps) {
  const accountName = name ?? "削除されたアカウント";

  return (
    <li
      className={twMerge(
        "flex flex-wrap items-center justify-between gap-2 px-6 py-3",
        className
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-meta font-semibold">
          <span className="mr-2 text-caption font-normal text-muted">
            {PLATFORM_LABELS[provider]}
          </span>
          {talent ? (
            <>
              {talent.name ? (
                <Link
                  className="text-accent hover:underline"
                  href={`/talents/${talent.id}`}
                >
                  {talent.name}
                </Link>
              ) : (
                "不明なタレント"
              )}
              <span className="ml-2 font-normal text-muted">{accountName}</span>
            </>
          ) : (
            accountName
          )}
        </p>
        {children}
        {error && <p className="text-meta text-danger">{error}</p>}
      </div>
      {aside}
    </li>
  );
}

/** 読み込み中の `BackfillAccountRow`。アカウント名と件数の2行と、バッジを置く */
export function BackfillAccountRowSkeleton() {
  return (
    <li className="flex items-center justify-between gap-2 px-6 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <Skeleton className="h-5 w-48 max-w-full" />
        <Skeleton className="h-5 w-64 max-w-full" />
      </div>
      <Skeleton className="h-5 w-12 shrink-0" />
    </li>
  );
}
