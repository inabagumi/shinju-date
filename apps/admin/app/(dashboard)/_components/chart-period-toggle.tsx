"use client";

import { Button } from "@shinju-date/ui";

import { CHART_PERIODS, getChartPeriodLabel } from "../_lib/chart-periods";
import type { ChartPeriod } from "../_lib/chart-periods";

interface ChartPeriodToggleProps {
  onChange: (period: ChartPeriod) => void;
  value: ChartPeriod;
}

/**
 * グラフの期間を選ぶボタンの組。選んでいる期間は塗りつぶしと `aria-pressed` で示す
 */
export const ChartPeriodToggle = ({
  onChange,
  value,
}: ChartPeriodToggleProps) => (
  // `legend` は `float` にすると、ほかの子と同じように flex で並ぶ
  <fieldset className="flex flex-wrap items-center gap-2">
    <legend className="float-left text-meta text-muted">グラフの期間</legend>
    <div className="flex gap-2">
      {CHART_PERIODS.map((period) => {
        const isSelected = period === value;

        return (
          <Button
            aria-pressed={isSelected}
            key={period}
            onClick={() => onChange(period)}
            size="sm"
            variant={isSelected ? "primary" : "secondary"}
          >
            {getChartPeriodLabel(period)}
          </Button>
        );
      })}
    </div>
  </fieldset>
);
