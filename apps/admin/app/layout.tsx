import { type ReactNode } from 'react'

export const metadata = {
  title: 'Admin UI - SHINJU DATE'
}

type Props = {
  children: ReactNode
}

export default function RootLayout({ children }: Props) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
