'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** 取り直しに失敗したが、理由がわからないとき（通信の失敗など）に出す文 */
export const POLLED_RESOURCE_FALLBACK_ERROR =
  '最新の状態を取得できませんでした。'

/** `fetcher` が取り直せなかったときの戻り値 */
export interface PolledResourceFailure {
  success: false
  error?: string | undefined
}

export interface UsePolledResourceOptions<T extends { success: true }> {
  /** サーバーコンポーネントで取得した、最初のデータ。`data` の型は、この値から決まる */
  initialData: T
  /**
   * データを取り直す Server Action。成功したときの戻り値（`success: true`）が、
   * そのまま `data` になる
   */
  fetcher: () => Promise<NoInfer<T> | PolledResourceFailure>
  /** 真を返す間だけ、`intervalMs` ごとに取り直す */
  isActive: (data: NoInfer<T>) => boolean
  /** 取り直す間隔（ミリ秒） */
  intervalMs: number
}

export interface UsePolledResourceReturn<T> {
  /** 最後に取得できたデータ。取り直しに失敗しても残る */
  data: T
  /** 最後の取り直しが失敗した理由。取り直せたら `null` に戻る */
  error: string | null
  /** いますぐ取り直す。失敗したときは `error` に理由を入れ、例外は投げない */
  reload: () => Promise<void>
}

/**
 * サーバーで取得したデータを最初に表示し、進行中の間だけ一定の間隔で取り直す。
 *
 * - 最初の表示は `initialData` を使い、マウントのあとの取得を待たない
 * - `isActive(data)` が真の間だけ `fetcher` を呼び、偽になったら止める
 * - 取り直しに失敗しても、前のデータを残して `error` に理由を入れる
 */
export function usePolledResource<T extends { success: true }>({
  fetcher,
  initialData,
  intervalMs,
  isActive,
}: UsePolledResourceOptions<T>): UsePolledResourceReturn<T> {
  const [data, setData] = useState(initialData)
  const [error, setError] = useState<string | null>(null)

  // `fetcher` が描画のたびに作り直されても、`reload` と間隔を作り直さない
  const fetcherRef = useRef(fetcher)

  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const reload = useCallback(async () => {
    let result: T | PolledResourceFailure

    try {
      result = await fetcherRef.current()
    } catch {
      result = { success: false }
    }

    if (result.success) {
      setData(result)
      setError(null)
    } else {
      setError(result.error || POLLED_RESOURCE_FALLBACK_ERROR)
    }
  }, [])

  const active = isActive(data)

  useEffect(() => {
    if (!active) {
      return
    }

    const timer = setInterval(() => {
      void reload()
    }, intervalMs)

    return () => clearInterval(timer)
  }, [active, intervalMs, reload])

  return { data, error, reload }
}
