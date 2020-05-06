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

import getValue from 'utils/getValue'

const SearchForm: FC = () => {
  const { query } = useRouter()
  const [value, setValue] = useState(() => getValue(query.q))
  const textFieldRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value)
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
    <>
      <form action="/search" method="get" onSubmit={handleSubmit} role="search">
        <div className="navbar__search">
          <input
            aria-label="検索"
            className="navbar__search-input"
            name="q"
            onChange={handleChange}
            placeholder="検索"
            ref={textFieldRef}
            type="search"
            value={value}
          />
        </div>
      </form>

      <style jsx>{`
        @media (max-width: 996px) {
          form {
            width: 100%;
          }

          .navbar__search {
            padding-right: var(--ifm-navbar-padding-horizontal);
          }

          .navbar__search :global(.navbar__search-input) {
            font-size: 1rem;
            width: 100%;
          }
        }
      `}</style>
    </>
  )
}

export default SearchForm
