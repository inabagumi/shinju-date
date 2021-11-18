import clsx from 'clsx'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getQueryValue } from '../lib/url'
import styles from './search-form.module.css'
import type { ChangeEventHandler, FormEventHandler, VFC } from 'react'

type Props = {
  basePath?: string
}

const SearchForm: VFC<Props> = ({ basePath = '/videos' }) => {
  const { query, ...router } = useRouter()
  const [value, setValue] = useState(() => getQueryValue('q', query))
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
          value={value ?? ''}
        />
      </div>
    </form>
  )
}

export default SearchForm
