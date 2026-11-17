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

/** `MouseEvent.button` の中ボタン */
const MIDDLE_BUTTON = 1

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
    const handleClick = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(VIDEO_LINK_SELECTOR)
      ) {
        markSearchExitClicked()
      }
    }

    // 中ボタンで新しいタブに開いたときも、動画を開いたとみなす。`auxclick` は
    // 右ボタンでも発火するが、メニューを開いただけでは動画を開いていない
    const handleAuxClick = (event: MouseEvent) => {
      if (event.button === MIDDLE_BUTTON) {
        handleClick(event)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleSearchExitLeave()
      }
    }

    document.addEventListener('click', handleClick, { capture: true })
    document.addEventListener('auxclick', handleAuxClick, { capture: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handleSearchExitLeave)

    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
      document.removeEventListener('auxclick', handleAuxClick, {
        capture: true,
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handleSearchExitLeave)
    }
  }, [])

  return null
}
