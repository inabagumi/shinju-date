'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const SELECTED_DATE_PARAM = 'date'

interface SelectedDateParam {
  /** URL の `date` パラメータの値（未選択なら `null`） */
  selectedDate: string | null
  /**
   * 日を選び、URL の `date` を書き換える。選択中の日をもう一度選ぶと、選択を解除する。
   * `from` / `to` などのほかのパラメータは引き継ぐので、グラフの期間は変わらない。
   */
  toggleDate: (date: string) => void
}

/**
 * グラフで選んだ日を、URL の `date` パラメータとして読み書きする。
 */
export function useSelectedDateParam(): SelectedDateParam {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedDate = searchParams.get(SELECTED_DATE_PARAM)

  const toggleDate = (date: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (params.get(SELECTED_DATE_PARAM) === date) {
      params.delete(SELECTED_DATE_PARAM)
    } else {
      params.set(SELECTED_DATE_PARAM, date)
    }

    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname)
  }

  return { selectedDate, toggleDate }
}
