import { Button } from "@shinju-date/ui";
import { Download } from "lucide-react";

export type ExportType =
  | "videos"
  | "talents"
  | "keywords"
  | "search-exit-rates";

interface ExportLinkProps {
  dateRange: { startDate: string; endDate: string };
  selectedDate?: string | null;
  type: ExportType;
}

/**
 * CSV のエクスポート（`/api/export/*`）の URL を作る。
 * 日付が選ばれているときはその1日、そうでなければ期間全体を指定する。
 */
export const buildExportHref = ({
  dateRange,
  selectedDate,
  type,
}: ExportLinkProps): string => {
  const params = new URLSearchParams();

  if (selectedDate) {
    params.set("date", selectedDate);
  } else {
    params.set("from", dateRange.startDate);
    if (dateRange.endDate !== dateRange.startDate) {
      params.set("to", dateRange.endDate);
    }
  }

  return `/api/export/${type}?${params.toString()}`;
};

/** ウィジェットの見出しに置く、CSV をダウンロードするリンク */
export const ExportLink = (props: ExportLinkProps) => (
  <Button
    asChild
    className="shrink-0 gap-1.5 whitespace-nowrap"
    size="sm"
    variant="secondary"
  >
    <a href={buildExportHref(props)}>
      <Download aria-hidden="true" className="size-4" />
      CSV をダウンロード
    </a>
  </Button>
);
