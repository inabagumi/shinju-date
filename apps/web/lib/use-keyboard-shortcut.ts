'use client'

import { useEffect } from 'react'

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: {
    ctrl?: boolean
    meta?: boolean
    shift?: boolean
    alt?: boolean
  } = {},
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrl = false, meta = false, shift = false, alt = false } = options

      const isModifierMatch =
        (!ctrl || event.ctrlKey) &&
        (!meta || event.metaKey) &&
        (!shift || event.shiftKey) &&
        (!alt || event.altKey)

      if (event.key.toLowerCase() === key.toLowerCase() && isModifierMatch) {
        // Check if we should trigger (ctrl+k on Windows/Linux or cmd+k on Mac)
        if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'k') {
          event.preventDefault()
          callback()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key, callback, options])
}
