import '../globals.css'
import type { Metadata, Viewport } from 'next'
import { title as siteName, themeColor } from '@/lib/constants'
import { lato } from '../_lib/fonts'

export const metadata: Metadata = {
  description: 'ただいまメンテナンス中です。しばらくお待ちください。',
  title: `メンテナンス中 - ${siteName}`,
}

export const viewport: Viewport = {
  themeColor,
}

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className={lato.variable} lang="ja">
      <head prefix="og: http://ogp.me/ns#" />
      <body className="min-h-svh bg-primary-foreground text-primary antialiased dark:bg-zinc-900 dark:text-774-nevy-50">
        {children}
      </body>
    </html>
  )
}
