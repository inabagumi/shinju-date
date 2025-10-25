'use client'

import { MSWProvider } from '@/components/msw-provider'
import { QueryProvider } from './query-client-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MSWProvider>
      <QueryProvider>{children}</QueryProvider>
    </MSWProvider>
  )
}
