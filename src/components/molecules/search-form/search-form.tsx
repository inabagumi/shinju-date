import React, {
  ChangeEvent,
  FC,
  FormEvent,
  ReactElement,
  useCallback,
  useRef
} from 'react'
import TextField from '../../atoms/text-field'

export interface SearchFormProps {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  query: string
}

const SearchForm: FC<SearchFormProps> = ({ onChange, query }): ReactElement => {
  const textFieldRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault()

      if (textFieldRef.current) textFieldRef.current.blur()
    },
    []
  )

  return (
    <>
      <form action="/search" method="get" onSubmit={handleSubmit} role="search">
        <div className="navbar__search">
          <TextField
            aria-label="検索"
            className="navbar__search-input"
            onChange={onChange}
            placeholder="検索"
            ref={textFieldRef}
            type="text"
            value={query}
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
