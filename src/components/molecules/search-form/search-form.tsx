import clsx from 'clsx'
import Router, { useRouter } from 'next/router'
import React, {
  ChangeEvent,
  FC,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import getValue from 'utils/get-value'
import styles from './search-form.module.css'

const SearchForm: FC = () => {
  const { query } = useRouter()
  const [value, setValue] = useState(() => getValue(query.q))
  const textFieldRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value)
  }, [])

  const handleFocus = useCallback(() => {
    Router.prefetch('/search')
  }, [])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault()

      Router.push(value ? `/search?q=${encodeURIComponent(value)}` : '/search')

      if (textFieldRef.current) textFieldRef.current.blur()
    },
    [value]
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
