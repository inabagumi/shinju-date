'use client'

import { useParams } from 'next/navigation'
import { type ComponentPropsWithoutRef, forwardRef, useMemo } from 'react'
import { experimental_useFormStatus as useFormStatus } from 'react-dom'

export default forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>(
  function SearchTextField({ disabled, value: defaultValue, ...props }, ref) {
    const { pending } = useFormStatus()
    const { queries } = useParams()
    const value = useMemo(
      () =>
        queries
          ? decodeURIComponent(
              Array.isArray(queries) ? queries.join('/') : queries
            )
          : undefined,
      [queries]
    )

    return (
      <input
        {...props}
        defaultValue={defaultValue ?? value}
        disabled={disabled ?? pending}
        ref={ref}
        type="search"
      />
    )
  }
)
