'use client'

import { useRouter } from 'next/navigation'
import {
  type ChangeEventHandler,
  type ComponentPropsWithRef,
  startTransition,
  useCallback,
  useOptimistic,
} from 'react'
import { twMerge } from 'tailwind-merge'
import type * as z from 'zod'
import type { searchParamsSchema } from '../_lib/search-params-schema'

export function Input({
  className,
  onChange,
  searchParams,
  ...props
}: Omit<ComponentPropsWithRef<'input'>, 'placeholder' | 'type' | 'value'> & {
  searchParams?: z.Infer<typeof searchParamsSchema> | undefined
}) {
  const router = useRouter()
  const [optimisticSearchParams, addOptimisticSearchParams] =
    useOptimistic(searchParams)

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      onChange?.(event)

      startTransition(() => {
        const query = event.target.value
        const newSearchParams = new URLSearchParams({ q: query })

        addOptimisticSearchParams({ q: query })
        router.replace(`?${newSearchParams.toString()}`)
      })
    },
    [onChange, addOptimisticSearchParams, router],
  )

  return (
    <input
      className={twMerge(
        'w-full border-0 bg-transparent px-4 py-4 text-primary outline-none placeholder:text-774-nevy-300 dark:text-774-nevy-50 dark:placeholder:text-774-nevy-400',
        className,
      )}
      onChange={handleChange}
      placeholder="動画を検索..."
      type="text"
      value={optimisticSearchParams?.q ?? ''}
      {...props}
    />
  )
}
