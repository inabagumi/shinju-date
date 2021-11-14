import clsx from 'clsx'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './search-form.module.css'
import type { ChangeEventHandler, FormEventHandler, VFC } from 'react'

function getQuery(valueOrValues: string | string[] | undefined): string {
  return (Array.isArray(valueOrValues) ? valueOrValues : [valueOrValues])
    .filter(Boolean)
    .join(' ')
}

const SearchForm: VFC = () => {
  const { pathname, query, ...router } = useRouter()
  const [value, setValue] = useState(() => getQuery(query.q))
  const textFieldRef = useRef<HTMLInputElement>(null)
  const basePath = useMemo(
    () =>
      pathname.startsWith('/channels/[id]') && query.id && query.id !== '_all'
        ? `/channels/${query.id}/videos`
        : pathname.startsWith('/groups/[id]') &&
          !Array.isArray(query.id) &&
          query.id
        ? `/groups/${query.id}/videos`
        : '/videos',
    [pathname, query]
  )

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setValue(event.target.value)
    },
    []
  )

  const handleFocus = useCallback(() => {
    void router.prefetch(basePath)
  }, [router, basePath])

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()

      void router.push(
        value ? `${basePath}?q=${encodeURIComponent(value)}` : basePath
      )

      if (textFieldRef.current) textFieldRef.current.blur()
    },
    [value, basePath, router]
  )

  useEffect(() => {
    setValue(getQuery(query.q))
  }, [query.q])

  return (
    <form
      action={basePath}
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
