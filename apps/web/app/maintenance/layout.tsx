import type { Metadata } from 'next'

export const metadata: Metadata = {
  description: 'ただいまメンテナンス中です。しばらくお待ちください。',
  title: 'メンテナンス中 - SHINJU DATE',
}

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
