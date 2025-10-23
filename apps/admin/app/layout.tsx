import './globals.css'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { MSWProvider } from '@/components/msw-provider'
import { lato } from './fonts'

export const viewport: Viewport = {
  themeColor: '#1e0064', // var(--color-primary)
}

export const metadata: Metadata = {
  description: 'SHINJU DATE管理画面 - 動画、用語集、アナリティクスの管理。',
  robots: {
    follow: false,
    index: false,
    noarchive: true,
    noimageindex: true,
    nosnippet: true,
  },
  title: {
    default: 'ダッシュボード - SHINJU DATE Admin',
    template: '%s - Admin UI - SHINJU DATE',
  },
}

type Props = {
  children: ReactNode
}

export default function RootLayout({ children }: Props) {
  return (
    <html className={lato.variable} lang="ja">
      <body className="font-sans text-primary">
        <MSWProvider>{children}</MSWProvider>
      </body>
    </html>
  )
}
