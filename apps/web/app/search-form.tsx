'use client'

import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import {
  type ChangeEventHandler,
  type FormEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState
} from 'react'
import { joinURL } from 'ufo'
import styles from './search-form.module.css'

type Props = {
  basePath?: string
  query?: string
}

export default function SearchForm({
  basePath = '/',
  query
}: Props): JSX.Element {
  const router = useRouter()
  const [value, setValue] = useState(() => query ?? '')
  const videosPath = useMemo(() => joinURL(basePath, 'videos'), [basePath])
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

      router.push(`${videosPath}/${encodeURIComponent(value)}`)

      textFieldRef.current?.blur()
    },
    [videosPath, value, router]
  )

  return (
    <form
      action={videosPath}
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
