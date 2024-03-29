'use client'

import { useParams } from 'next/navigation'
import {
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  forwardRef,
  useCallback,
  useEffect,
  useState
} from 'react'
import { useFormStatus } from 'react-dom'

export const SearchTextField = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<'input'>
>(function SearchTextField({ disabled, value: defaultValue, ...props }, ref) {
  const { pending } = useFormStatus()
  const [value, setValue] = useState(defaultValue ?? '')
  const { queries } = useParams()

  useEffect(() => {
    const query = (Array.isArray(queries) ? queries : [queries])
      .map((value = '') => decodeURIComponent(value))
      .join('/')

    setValue(query)
  }, [queries])

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    ({ target }) => {
      setValue(target.value)
    },
    []
  )

  return (
    <input
      disabled={disabled ?? pending}
      onChange={handleChange}
      ref={ref}
      value={value}
      {...props}
    />
  )
})
