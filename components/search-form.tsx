import clsx from 'clsx'
import { useRouter } from 'next/router'
import {
  type ChangeEventHandler,
  type FormEventHandler,
  type VFC,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { useBasePath } from '../components/layout'
import { getQueryValue, join as urlJoin } from '../lib/url'
import styles from './search-form.module.css'

const SearchForm: VFC = () => {
  const { query, ...router } = useRouter()
  const [value, setValue] = useState(() => getQueryValue('queries', query))
  const textFieldRef = useRef<HTMLInputElement>(null)
  const basePath = useBasePath()

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
        .push(
          urlJoin(basePath, 'videos', value ? encodeURIComponent(value) : '')
        )
        .finally(() => {
          textFieldRef.current?.blur()
        })
    },
    [value, basePath, router]
  )

  useEffect(() => {
    const newValue = getQueryValue('queries', query)

    setValue(newValue)
  }, [query])

  return (
    <form
      action={urlJoin(basePath, 'videos')}
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
