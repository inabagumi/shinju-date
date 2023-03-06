import { type ReactNode } from 'react'
import Provider from './provider'

export const metadata = {
  themeColor: '#212121',
  title: 'Admin UI - SHINJU DATE'
}

type Props = {
  children: ReactNode
}

export default function RootLayout({ children }: Props) {
  return (
    <html lang="ja">
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  )
}
