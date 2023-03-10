'use client'

import { Button, SkeletonText, chakra } from '@shinju-date/chakra-ui'
import NextLink from 'next/link'
import { type FormEventHandler, useCallback } from 'react'
import { useAuth } from '@/app/session'

export function SignOutButton(): JSX.Element {
  const { signOut } = useAuth()

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()

      void signOut()
    },
    [signOut]
  )

  return (
    <chakra.form
      action=""
      display="inline-block"
      method="POST"
      onSubmit={handleSubmit}
    >
      <Button size="sm" type="submit">
        ログアウト
      </Button>
    </chakra.form>
  )
}

export function SignInButton(): JSX.Element {
  return (
    <chakra.div display="inline-block">
      <Button as={NextLink} href="/login" role="button" size="sm">
        ログイン
      </Button>
    </chakra.div>
  )
}

export function SkeletonButton(): JSX.Element {
  return (
    <chakra.div display="inline-block">
      <Button size="sm">
        <SkeletonText noOfLines={1} width="4em" />
      </Button>
    </chakra.div>
  )
}

export default function AuthButton(): JSX.Element {
  const { signedIn } = useAuth()

  if (typeof signedIn === 'undefined') {
    return <SkeletonButton />
  }

  return signedIn ? <SignOutButton /> : <SignInButton />
}
