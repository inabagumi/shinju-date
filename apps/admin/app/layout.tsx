import { ColorModeScript } from '@shinju-date/chakra-ui'
import { type ReactNode } from 'react'
import { createSupabaseClient } from '@/lib/supabase/server'
import Provider from './provider'

export const metadata = {
  themeColor: '#212121',
  title: 'Admin UI - SHINJU DATE'
}

type Props = {
  children: ReactNode
}

export default async function RootLayout({ children }: Props) {
  const supabase = createSupabaseClient()
  const {
    data: { session }
  } = await supabase.auth.getSession()

  return (
    <html lang="ja">
      <body>
        <Provider session={session ?? undefined}>
          <ColorModeScript initialColorMode="system" />

          {children}
        </Provider>
      </body>
    </html>
  )
}
