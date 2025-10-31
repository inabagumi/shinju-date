'use client'

import { useEffect } from 'react'

export function MSWProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env['ENABLE_MSW'] === 'true') {
      import('@/lib/msw').then(({ startMocking }) => {
        startMocking()
      })
    }
  }, [])

  return <>{children}</>
}
