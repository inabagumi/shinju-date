'use client'

import { type ComponentPropsWithoutRef } from 'react'
import { useFormStatus } from 'react-dom'

type Props = ComponentPropsWithoutRef<'button'>

export default function SignOutButton({
  disabled,
  type = 'submit',
  ...props
}: Props) {
  const { pending } = useFormStatus()

  return <button disabled={disabled ?? pending} type={type} {...props} />
}
