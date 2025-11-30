'use client'

import { QueryProvider } from './query-client-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>
}
