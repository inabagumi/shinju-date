import classNames from 'classnames'
import React, {
  ChangeEvent,
  FC,
  FormEvent,
  ReactElement,
  useCallback,
  useRef,
  useState
} from 'react'
import TextField from '../../atoms/text-field'

export interface SearchFormProps {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  query: string
}

const SearchForm: FC<SearchFormProps> = ({ onChange, query }): ReactElement => {
  const textFieldRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocusesd] = useState<boolean>(false)

  const handleBlur = useCallback((): void => {
    setIsFocusesd(false)
  }, [])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault()

      if (textFieldRef.current) textFieldRef.current.blur()
    },
    []
  )

  const handleFocus = useCallback((): void => {
    setIsFocusesd(true)
  }, [])

  const icon = (
    <svg height="20" viewBox="0 0 24 24" width="20">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
      <path d="M0 0h24v24H0z" fill="none" />
    </svg>
  )

  return (
    <>
      <form
        action="/search"
        className={classNames('search-form', {
          'search-form--focused': isFocused
        })}
        method="get"
        onSubmit={handleSubmit}
        role="search"
      >
        <TextField
          aria-label="検索"
          icon={icon}
          onBlur={handleBlur}
          onChange={onChange}
          onFocus={handleFocus}
          placeholder="検索"
          ref={textFieldRef}
          value={query}
        />
      </form>

      <style jsx>{`
        .search-form {
          margin: 0;
          width: 100%;
        }

        @media (min-width: 500px) {
          .search-form {
            transition: width 0.3s ease-out;
            width: 240px;
          }

          .search-form--focused {
            transition-timing-function: ease-in;
            width: 320px;
          }
        }
      `}</style>
    </>
  )
}

export default SearchForm
