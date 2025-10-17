import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: '用語集',
}

export default function TermsLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-8 py-4 md:px-4">
      <h1 className="font-semibold text-2xl">用語集</h1>

      <main>{children}</main>
    </div>
  )
}
