'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import {
  buildSearchParamsHref,
  type SearchParamsHrefOptions,
  type SearchParamUpdates,
} from './search-params-href'

export interface UpdateSearchParamsOptions extends SearchParamsHrefOptions {
  /** 履歴に積むか（`push`）、置き換えるか（`replace`）。既定は `replace` */
  history?: 'push' | 'replace' | undefined
}

/**
 * 現在のページのパスとパラメータから、パラメータを書き換えた URL を作る関数を返す。
 * `Link` の `href` に使う。
 */
export function useSearchParamsHref(): (
  updates: SearchParamUpdates,
  options?: SearchParamsHrefOptions,
) => string {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return useCallback(
    (updates, options) =>
      buildSearchParamsHref(
        pathname,
        searchParams.toString(),
        updates,
        options,
      ),
    [pathname, searchParams],
  )
}

/**
 * 現在のページの URL のパラメータを書き換えて移動する関数を返す。
 *
 * @example
 * const update = useUpdateSearchParams()
 *
 * update({ search: 'abc' }) // 既定: replace、page を消す
 * update({ page: '3' }, { history: 'push', resetPage: false })
 * update({ status: ['LIVE', 'ENDED'] }) // 同じ名前の複数の値にする
 * update({ search: null }) // パラメータを消す
 */
export function useUpdateSearchParams(): (
  updates: SearchParamUpdates,
  options?: UpdateSearchParamsOptions,
) => void {
  const router = useRouter()
  const createHref = useSearchParamsHref()

  return useCallback(
    (updates, { history = 'replace', ...options } = {}) => {
      const href = createHref(updates, options)

      if (history === 'push') {
        router.push(href)
      } else {
        router.replace(href)
      }
    },
    [createHref, router],
  )
}
