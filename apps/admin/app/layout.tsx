import './globals.css'
import { type Metadata, type Viewport } from 'next'
import { type ReactNode } from 'react'
import { lato } from './fonts'

export const viewport: Viewport = {
  themeColor: '#1e0064' // var(--color-primary)
}

export const metadata: Metadata = {
  title: 'Admin UI - SHINJU DATE'
}

type Props = {
  children: ReactNode
}

export default function RootLayout({ children }: Props) {
  return (
    <html className={lato.variable} lang="ja">
      <body className="font-sans text-primary">{children}</body>
    </html>
  )
}
