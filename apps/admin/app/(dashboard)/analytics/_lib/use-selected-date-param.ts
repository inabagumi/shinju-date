"use client";

import { useSearchParams } from "next/navigation";

import { useUpdateSearchParams } from "@/lib/use-update-search-params";

const SELECTED_DATE_PARAM = "date";

interface SelectedDateParam {
  /** URL の `date` パラメータの値（未選択なら `null`） */
  selectedDate: string | null;
  /**
   * 日を選び、URL の `date` を書き換える。選択中の日をもう一度選ぶと、選択を解除する。
   * `from` / `to` などのほかのパラメータは引き継ぐので、グラフの期間は変わらない。
   */
  toggleDate: (date: string) => void;
}

/**
 * グラフで選んだ日を、URL の `date` パラメータとして読み書きする。
 */
export const useSelectedDateParam = (): SelectedDateParam => {
  const searchParams = useSearchParams();
  const updateSearchParams = useUpdateSearchParams();
  const selectedDate = searchParams.get(SELECTED_DATE_PARAM);

  const toggleDate = (date: string) => {
    updateSearchParams(
      { [SELECTED_DATE_PARAM]: selectedDate === date ? null : date },
      { history: "push", resetPage: false }
    );
  };

  return { selectedDate, toggleDate };
};
