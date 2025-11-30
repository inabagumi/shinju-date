'use client'

import { useEffect } from 'react'

export function MSWProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    import('@/lib/msw').then(({ startMocking }) => {
      startMocking()
    })
  }, [])

  return <>{children}</>
}
