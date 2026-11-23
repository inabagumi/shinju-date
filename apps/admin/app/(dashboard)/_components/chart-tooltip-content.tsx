import { twMerge } from "@shinju-date/ui";
import type { TooltipContentProps } from "recharts";

import type { ChartSeries } from "../_lib/chart-series";

interface ChartTooltipContentProps extends Partial<
  Pick<TooltipContentProps, "active" | "label" | "payload">
> {
  /** 系列の名前と値を、系列の色で表示する（既定では本文の色） */
  colorItems?: boolean;
  formatLabel?: (label: string) => string;
  formatValue: (value: number) => string;
  series: ChartSeries[];
}

/** 値がない（`null` などの）点の表示。0 と区別する */
const MISSING_VALUE = "データなし";

/**
 * Recharts の `<Tooltip content={…} />` に渡すツールチップの中身。
 * 既定の中身は色を inline style で持つため、セマンティックカラーのクラスで描き直す。
 */
export const ChartTooltipContent = ({
  active,
  colorItems = false,
  formatLabel,
  formatValue,
  label,
  payload,
  series,
}: ChartTooltipContentProps) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-container border border-border bg-surface p-2.5 whitespace-nowrap text-foreground">
      <p className="font-semibold">
        {typeof label === "string" && formatLabel ? formatLabel(label) : label}
      </p>
      <ul>
        {payload.map((entry) => {
          const item = series.find(({ key }) => key === entry.dataKey);

          return (
            <li
              className={twMerge("py-1", colorItems && item?.className)}
              key={String(entry.dataKey)}
            >
              {item?.label ?? entry.name} :{" "}
              {typeof entry.value === "number"
                ? formatValue(entry.value)
                : MISSING_VALUE}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
