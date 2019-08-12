import React, {
  ChangeEvent,
  FC,
  FormEvent,
  ReactElement,
  useCallback,
  useRef
} from 'react'

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
          <input
            aria-label="検索"
            defaultValue={query}
            onChange={onChange}
            placeholder="検索"
            ref={textFieldRef}
            type="text"
          />
        </div>
      </form>
    </>
  )
}

export default SearchForm
