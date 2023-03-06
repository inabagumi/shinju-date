'use client'

import { CacheProvider } from '@chakra-ui/next-js'
import { type Session } from '@supabase/auth-helpers-nextjs'
import { type ReactNode } from 'react'
import { ChakraProvider, ColorModeScript } from '@/lib/chakra-ui'
import { SessionProvider } from './session'

type Props = {
  children: ReactNode
  session?: Session
}

export default function Provider({ children, session }: Props) {
  return (
    <CacheProvider>
      <ChakraProvider>
        <SessionProvider session={session}>
          <ColorModeScript initialColorMode="system" />

          {children}
        </SessionProvider>
      </ChakraProvider>
    </CacheProvider>
  )
}
