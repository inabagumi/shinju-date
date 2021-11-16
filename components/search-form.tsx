import clsx from 'clsx'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getQueryValue } from '../lib/url'
import styles from './search-form.module.css'
import type { ParsedUrlQuery } from 'querystring'
import type { ChangeEventHandler, FormEventHandler, VFC } from 'react'

function getBasePath(pathname: string, query: ParsedUrlQuery) {
  const id = getQueryValue('id', query)

  if (id) {
    if (pathname.startsWith('/channels/[id]')) {
      return `/channels/${id}/videos`
    } else if (pathname.startsWith('/groups/[id]')) {
      return `/groups/${id}/videos`
    }
  }

  return '/videos'
}

const SearchForm: VFC = () => {
  const { pathname, query, ...router } = useRouter()
  const [value, setValue] = useState(() => getQueryValue('q', query))
  const textFieldRef = useRef<HTMLInputElement>(null)
  const basePath = useMemo(
    () => getBasePath(pathname, query),
    [pathname, query]
  )

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setValue(event.target.value)
    },
    []
  )

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()

      router
        .push(value ? `${basePath}?q=${encodeURIComponent(value)}` : basePath)
        .finally(() => {
          if (textFieldRef.current) {
            textFieldRef.current.blur()
          }
        })
    },
    [value, basePath, router]
  )

  useEffect(() => {
    setValue(getQueryValue('q', query))
  }, [query])

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
