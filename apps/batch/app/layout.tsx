import { type Metadata } from 'next'
import { type ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'batch.shinju.date'
}

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
