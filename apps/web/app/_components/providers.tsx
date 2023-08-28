'use client'

import { ThemeProvider } from 'next-themes'
import { type ReactNode } from 'react'
import { Provider as BalancerProvider } from 'react-wrap-balancer'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <BalancerProvider>{children}</BalancerProvider>
    </ThemeProvider>
  )
}
