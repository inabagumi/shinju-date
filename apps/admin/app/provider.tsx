'use client'

import { CacheProvider } from '@chakra-ui/next-js'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export default function Provider({ children }: Props) {
  return (
    <CacheProvider>
      <ChakraProvider>
        <ColorModeScript initialColorMode="system" />

        {children}
      </ChakraProvider>
    </CacheProvider>
  )
}
