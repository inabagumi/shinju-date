import React, { ChangeEvent, FC } from 'react'

type Props = {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  query: string
}

const SearchForm: FC<Props> = ({ onChange, query }) => {
  return (
    <>
      <style jsx>{`
        .text-field {
          appearance: none;
          border: 1px solid #e0e0e0;
          border-radius: 3px;
          box-sizing: border-box;
          color: #424242;
          display: block;
          font-family: inherit;
          font-size: 1rem;
          line-height: 1.5;
          max-width: 100%;
          padding: 0 0.2em;
          transition: width 0.5s ease;
          width: 240px;
        }

        .text-field:focus {
          border-color: #9e9e9e;
          outline: 0;
          width: 320px;
        }
      `}</style>

      <form action="/search" onSubmit={event => event.preventDefault()}>
        <div>
          <input
            className="text-field"
            defaultValue={query}
            name="q"
            type="text"
            onChange={event => onChange && onChange(event)}
          />
        </div>
      </form>
    </>
  )
}

export default SearchForm
