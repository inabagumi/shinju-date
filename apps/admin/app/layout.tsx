import './globals.css'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { ActionToastProvider } from '@/components/action-toast'
import { lato } from './fonts'

export const viewport: Viewport = {
  themeColor: '#1e0064', // var(--color-primary)
}

export const metadata: Metadata = {
  description:
    'SHINJU DATEの管理画面です。動画、用語集の管理とアナリティクスの閲覧ができます。',
  robots: {
    follow: false,
    index: false,
    noarchive: true,
    noimageindex: true,
    nosnippet: true,
  },
  title: {
    default: 'Admin UI - SHINJU DATE',
    template: '%s - Admin UI - SHINJU DATE',
  },
}

interface Props {
  children: ReactNode
}

export default function RootLayout({ children }: Props) {
  return (
    // チェックボックスや日付の入力欄などのブラウザ標準の部品も、OS の設定に合わせて明暗を切り替える
    <html className={`${lato.variable} scheme-light-dark`} lang="ja">
      <body className="bg-background font-sans text-foreground">
        <ActionToastProvider>{children}</ActionToastProvider>
      </body>
    </html>
  )
}
