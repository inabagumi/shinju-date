'use client'

import clsx from 'clsx'
import { useParams, useRouter } from 'next/navigation'
import {
  type ChangeEventHandler,
  type FormEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState
} from 'react'
import styles from './search-form.module.css'

export default function SearchForm(): JSX.Element {
  const router = useRouter()
  const params = useParams()
  const query = useMemo<string>(
    () => (params.queries ? decodeURIComponent(params.queries) : ''),
    [params.queries]
  )
  const [value, setValue] = useState(() => query)
  const textFieldRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setValue(event.target.value)
    },
    []
  )

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()

      router.push(`/videos/${encodeURIComponent(value)}`)

      textFieldRef.current?.blur()
    },
    [value, router]
  )

  return (
    <form
      action="/videos"
      className={styles.form}
      method="get"
      onSubmit={handleSubmit}
      role="search"
    >
      <div className={clsx('navbar__search', styles.content)}>
        <input
          aria-label="検索"
          className={clsx('navbar__search-input', styles.input)}
          name="q"
          onChange={handleChange}
          placeholder="検索"
          ref={textFieldRef}
          type="search"
          value={value}
        />
      </div>
    </form>
  )
}
