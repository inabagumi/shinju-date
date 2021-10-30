import clsx from 'clsx'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import getValue from '../utils/getValue'
import styles from './search-form.module.css'
import type { ChangeEvent, FormEvent, VFC } from 'react'

const SearchForm: VFC = () => {
  const { query, ...router } = useRouter()
  const [value, setValue] = useState(() => getValue(query.q))
  const textFieldRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value)
  }, [])

  const handleFocus = useCallback(() => {
    void router.prefetch('/search')
  }, [router])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault()

      void router.push(
        value ? `/search?q=${encodeURIComponent(value)}` : '/search'
      )

      if (textFieldRef.current) textFieldRef.current.blur()
    },
    [value, router]
  )

  useEffect(() => {
    setValue(getValue(query.q))
  }, [query.q])

  return (
    <form
      action="/search"
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
          onFocus={handleFocus}
          placeholder="検索"
          ref={textFieldRef}
          type="search"
          value={value}
        />
      </div>
    </form>
  )
}

export default SearchForm
