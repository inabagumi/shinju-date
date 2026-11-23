"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { buildSearchParamsHref } from "@/lib/search-params-href";

import {
  CHART_PERIOD_PARAM,
  DEFAULT_CHART_PERIOD,
  parseChartPeriod,
} from "./chart-periods";
import type { ChartPeriod } from "./chart-periods";

interface ChartPeriodParam {
  /** URL の `period` パラメータの期間（ないときは最初の期間） */
  period: ChartPeriod;
  /** 期間を選び、URL の `period` を書き換える */
  setPeriod: (period: ChartPeriod) => void;
}

/**
 * 動画サマリーのグラフで選んだ期間を、URL の `period` パラメータとして読み書きする。
 * 再読み込みやリンクの共有でも、同じ期間で開ける。
 *
 * URL は `window.history.replaceState()` で書き換える。Next.js はこれを
 * `useSearchParams()` に反映するので、サーバーへのリクエストなしに期間が切り替わる
 * （`router.replace()` と違い、ページをサーバーでレンダリングし直さない）。
 * 期間の切り替えで履歴は積まない。最初の期間はパラメータを消して、URL を短く保つ
 */
export const useChartPeriodParam = (): ChartPeriodParam => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = parseChartPeriod(searchParams.get(CHART_PERIOD_PARAM));

  const setPeriod = (next: ChartPeriod) => {
    const href = buildSearchParamsHref(
      pathname,
      searchParams.toString(),
      {
        [CHART_PERIOD_PARAM]:
          next === DEFAULT_CHART_PERIOD ? null : next.toString(10),
      },
      { resetPage: false }
    );

    window.history.replaceState(null, "", href);
  };

  return { period, setPeriod };
};
