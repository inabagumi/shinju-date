import Router from 'next/router'
import React, { ChangeEvent, FC, useCallback } from 'react'

type Props = {
  query?: string
}

const SearchForm: FC<Props> = ({ query }) => {
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { target } = event

    Router.push(
      target.value ? `/search?q=${encodeURIComponent(target.value)}` : '/'
    )
  }, [])

  const handleSubmit = useCallback(event => event.preventDefault(), [])

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

      <form action="/search" onSubmit={handleSubmit}>
        <div>
          <input
            className="text-field"
            defaultValue={query}
            name="q"
            type="text"
            onChange={handleChange}
          />
        </div>
      </form>
    </>
  )
}

export default SearchForm
