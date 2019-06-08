import classNames from 'classnames'
import React, {
  ChangeEvent,
  FC,
  FormEvent,
  useCallback,
  useRef,
  useState
} from 'react'
import TextField from '../../atoms/text-field'

interface Props {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  query: string
}

const SearchForm: FC<Props> = ({ onChange, query }) => {
  const textFieldRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocusesd] = useState<boolean>(false)

  const handleBlur = useCallback(() => {
    setIsFocusesd(false)
  }, [])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (textFieldRef.current) textFieldRef.current.blur()
    },
    []
  )

  const handleFocus = useCallback(() => {
    setIsFocusesd(true)
  }, [])

  return (
    <>
      <form
        action="/search"
        className={classNames('search-form', {
          'search-form--focused': isFocused
        })}
        method="get"
        onSubmit={handleSubmit}
      >
        <TextField
          aria-label="検索"
          icon="search"
          onBlur={handleBlur}
          onChange={onChange}
          onFocus={handleFocus}
          ref={textFieldRef}
          value={query}
        />
      </form>

      <style jsx>{`
        .search-form {
          margin: 0;
          transition: width 0.3s ease-out;
          width: 240px;
        }

        .search-form--focused {
          transition-timing-function: ease-in;
          width: 320px;
        }
      `}</style>
    </>
  )
}

export default SearchForm
