import { Button } from "@shinju-date/ui";
import Link from "next/link";

export const NotFoundContent = () => (
  <div className="flex min-h-[calc(100svh-10rem)] items-center justify-center py-6">
    <div className="w-full max-w-md text-center">
      <div className="mb-8">
        <p className="mb-2 text-display font-bold text-muted tabular-nums">
          404
        </p>
        <h2 className="mb-4 text-title font-bold">ページが見つかりません</h2>
        <p className="text-meta text-muted">
          お探しのページは存在しないか、削除された可能性があります。
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/">ダッシュボードに戻る</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/videos">動画一覧を見る</Link>
        </Button>
      </div>
    </div>
  </div>
);
