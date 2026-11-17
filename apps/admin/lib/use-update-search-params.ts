'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const PAGE_PARAM = 'page'

/**
 * パラメータに設定する値。配列は同じ名前の複数の値にする。
 * `null`・空文字・空の配列はパラメータを消し、`undefined` はそのまま引き継ぐ
 */
export type SearchParamValue = string | readonly string[] | null | undefined

/** パラメータの名前と、設定する値 */
export type SearchParamUpdates = Readonly<Record<string, SearchParamValue>>

export interface SearchParamsHrefOptions {
  /** `page` を消すか。既定は `true`（絞り込みを変えたら1ページ目に戻す） */
  resetPage?: boolean | undefined
}

export interface UpdateSearchParamsOptions extends SearchParamsHrefOptions {
  /** 履歴に積むか（`push`）、置き換えるか（`replace`）。既定は `replace` */
  history?: 'push' | 'replace' | undefined
}

/**
 * 現在のパラメータを引き継いで、指定したパラメータだけを書き換えた URL を返す。
 */
export function buildSearchParamsHref(
  pathname: string,
  searchParams: URLSearchParams | string,
  updates: SearchParamUpdates,
  { resetPage = true }: SearchParamsHrefOptions = {},
): string {
  const params = new URLSearchParams(searchParams)

  for (const [name, value] of Object.entries(updates)) {
    if (value === undefined) {
      continue
    }

    if (typeof value === 'string') {
      if (value === '') {
        params.delete(name)
      } else {
        params.set(name, value)
      }
      continue
    }

    params.delete(name)
    for (const item of value ?? []) {
      params.append(name, item)
    }
  }

  if (resetPage && !(PAGE_PARAM in updates)) {
    params.delete(PAGE_PARAM)
  }

  const queryString = params.toString()

  return queryString ? `${pathname}?${queryString}` : pathname
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
