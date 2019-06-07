import classNames from 'classnames'
import React, {
  ChangeEvent,
  FC,
  FormEvent,
  useCallback,
  useState,
  useRef
} from 'react'

type Props = {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  query: string
}

const SearchForm: FC<Props> = ({ onChange, query }) => {
  const textFieldRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState<string>(query)
  const [isFocused, setIsFocusesd] = useState<boolean>(false)

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value)

      if (typeof onChange === 'function') onChange(event)
    },
    [setValue, onChange]
  )

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (textFieldRef.current && isFocused) textFieldRef.current.blur()
    },
    [isFocused, textFieldRef.current]
  )

  return (
    <>
      <style jsx>{`
        .text-field {
          align-items: center;
          background-color: #f5f5f5;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          box-sizing: border-box;
          color: #9e9e9e;
          display: flex;
          max-width: 100%;
          position: relative;
          transition-duration: 0.3s;
          transition-property: background-color, border-color, color, width;
          transition-timing-function: ease-out;
          width: 240px;
        }

        .text-field:hover,
        .text-field--focused {
          border-color: #616161;
          color: #616161;
          transition-timing-function: ease-in;
        }

        .text-field--focused {
          background-color: #fff;
          width: 320px;
        }

        .text-field__label {
          display: block;
          left: 6px;
          overflow: hidden;
          position: absolute;
        }

        .text-field__icon {
          display: block;
          font-size: 20px;
          pointer-events: none;
        }

        .text-field__input {
          appearance: none;
          background-color: transparent;
          border: 0;
          box-sizing: border-box;
          color: #616161;
          display: block;
          font-family: inherit;
          font-size: 1rem;
          height: 100%;
          line-height: 1.5;
          padding: 0.25rem 6px 0.25rem 30px;
          width: 100%;
        }

        .text-field__input:focus {
          outline: 0;
        }
      `}</style>

      <form action="/search" method="get" onSubmit={handleSubmit}>
        <div
          className={classNames('text-field', {
            'text-field--focused': isFocused
          })}
        >
          <label className="text-field__label" htmlFor="search-query">
            <span aria-label="検索" className="material-icons text-field__icon">
              search
            </span>
          </label>

          <input
            className="text-field__input"
            id="search-query"
            name="q"
            type="search"
            onBlur={() => setIsFocusesd(false)}
            onChange={handleChange}
            onFocus={() => setIsFocusesd(true)}
            ref={textFieldRef}
            value={value}
          />
        </div>
      </form>
    </>
  )
}

export default SearchForm
