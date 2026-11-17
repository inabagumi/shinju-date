'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import {
  handleSearchExitLeave,
  handleSearchExitNavigation,
  markSearchExitClicked,
} from '@/lib/search-exit'

/** 動画のリンク。開くと `/api/ping` に通知する */
const VIDEO_LINK_SELECTOR = 'a[ping="/api/ping"]'

/**
 * 検索からの離脱を検知する。ルートレイアウトに置き、ページを移動しても
 * 残るようにする。`<Link>` と `router.push` のどちらの移動も、
 * `usePathname()` の変化で拾う。
 */
export default function SearchExitObserver() {
  const pathname = usePathname()

  useEffect(() => {
    handleSearchExitNavigation(pathname)
  }, [pathname])

  useEffect(() => {
    // 中ボタンで新しいタブに開いたとき（`auxclick`）も、動画を開いたとみなす
    const handleClick = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(VIDEO_LINK_SELECTOR)
      ) {
        markSearchExitClicked()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleSearchExitLeave()
      }
    }

    document.addEventListener('click', handleClick, { capture: true })
    document.addEventListener('auxclick', handleClick, { capture: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handleSearchExitLeave)

    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
      document.removeEventListener('auxclick', handleClick, { capture: true })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handleSearchExitLeave)
    }
  }, [])

  return null
}
