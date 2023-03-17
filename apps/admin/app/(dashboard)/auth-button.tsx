'use client'

import { Button, SkeletonText, chakra } from '@shinju-date/chakra-ui'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEventHandler, useCallback, useState } from 'react'
import { useAuth } from '@/app/session'

export function SignOutButton(): JSX.Element {
  const router = useRouter()
  const { signOut } = useAuth()
  const [isDisabled, setIsDisabled] = useState(false)

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()

      setIsDisabled(true)

      signOut()
        .then(() => {
          router.push('/login')
        })
        .catch(() => {
          setIsDisabled(false)
        })
    },
    [signOut, router]
  )

  return (
    <chakra.form
      action=""
      display="inline-block"
      method="POST"
      onSubmit={handleSubmit}
    >
      <Button isLoading={isDisabled} size="sm" type="submit">
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
