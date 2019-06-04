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
  const [isFocused, setIsFocusesd] = useState<boolean>(false)

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
          background-color: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          box-sizing: border-box;
          color: #9e9e9e;
          display: flex;
          max-width: 100%;
          position: relative;
          transition: border-color 0.2s ease, color 0.2s ease, width 0.3s ease;
          width: 240px;
        }

        .text-field:hover,
        .text-field--focused {
          border-color: #616161;
        }

        .text-field:hover {
          color: #616161;
        }

        .text-field--focused {
          color: #424242;
          width: 320px;
        }

        .text-field__icon {
          display: block;
          font-size: 20px;
          left: 6px;
          pointer-events: none;
          position: absolute;
        }

        .text-field__input {
          appearance: none;
          background-color: transparent;
          border: 0;
          box-sizing: border-box;
          color: inherit;
          display: flex;
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
          <span className="material-icons text-field__icon">search</span>
          <input
            className="text-field__input"
            defaultValue={query}
            name="q"
            type="text"
            onBlur={() => setIsFocusesd(false)}
            onChange={event => onChange && onChange(event)}
            onFocus={() => setIsFocusesd(true)}
            ref={textFieldRef}
          />
        </div>
      </form>
    </>
  )
}

export default SearchForm
