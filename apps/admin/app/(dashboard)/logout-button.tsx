'use client'

import { Box, Button } from '@shinju-date/chakra-ui'
import { useRouter } from 'next/navigation'
import { type FormEventHandler, type ReactNode, useCallback } from 'react'
import { useSupabaseClient } from '@/app/session'

export type Props = {
  children: ReactNode
}

export default function LogoutButton({ children }: Props) {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const handleSubmit = useCallback<FormEventHandler>(
    (event) => {
      if (!supabase) {
        return
      }

      event.preventDefault()

      void supabase.auth.signOut().then(() => {
        router.push('/login')
      })
    },
    [supabase, router]
  )

  return (
    <Box
      action="/logout"
      as="form"
      display="inline-block"
      method="post"
      onSubmit={handleSubmit}
    >
      <Button size="sm" type="submit">
        {children}
      </Button>
    </Box>
  )
}
