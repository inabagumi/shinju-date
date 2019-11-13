import { Response, QueryParameters } from 'algoliasearch'
import algoliasearch, { Index } from 'algoliasearch/lite'
import { Reducer, useEffect, useReducer } from 'react'

const QUERY_FROM_PREFIX = 'from:'

type ParsedQuery = {
  filters: string
  keywords: string[]
}

const parseQuery = (query: string): ParsedQuery => {
  const keywords: string[] = []
  const channels: string[] = []

  query.split(/\s+/).forEach((keyword): void => {
    if (
      keyword.startsWith(QUERY_FROM_PREFIX) &&
      keyword.length > QUERY_FROM_PREFIX.length
    ) {
      channels.push(keyword.slice(QUERY_FROM_PREFIX.length))
    } else {
      keywords.push(keyword)
    }
  })

  return {
    keywords,
    filters: channels
      .map((channel): string => `channel.id:"${channel}"`)
      .join(' ')
  }
}

const getIndex = (): Index => {
  if (!process.env.ALGOLIA_APPLICATION_ID) {
    throw new TypeError('Application ID is required.')
  }
  if (!process.env.ALGOLIA_API_KEY) {
    throw new TypeError('API key is required.')
  }
  if (!process.env.ALGOLIA_INDEX_NAME) {
    throw new TypeError('Index name is required.')
  }

  const client = algoliasearch(
    process.env.ALGOLIA_APPLICATION_ID,
    process.env.ALGOLIA_API_KEY
  )
  const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME)

  return index
}

let index: Index

function search<T>(
  query: string,
  params: QueryParameters
): Promise<Response<T>> {
  index = index || getIndex()
  const { keywords, filters } = parseQuery(query)

  return index.search<T>({
    filters,
    query: keywords.join(' '),
    hitsPerPage: 9,
    ...params
  })
}

type State<T> = {
  hasNext: boolean
  items: T[]
  isLoading: boolean
}

type ActionPayload<T> = {
  hasNext: boolean
  items: T[]
  page: number
}

type Action<T> =
  | { type: 'SEARCH_FAILURE' }
  | { type: 'SEARCH_INIT' }
  | { payload: ActionPayload<T>; type: 'SEARCH_SUCCESS' }

const createSearchReducer = <T>(): Reducer<State<T>, Action<T>> => {
  return (state: State<T>, action: Action<T>): State<T> => {
    switch (action.type) {
      case 'SEARCH_FAILURE':
        return {
          ...state,
          hasNext: false,
          isLoading: false
        }
      case 'SEARCH_INIT':
        return {
          ...state,
          isLoading: true
        }
      case 'SEARCH_SUCCESS':
        return {
          ...state,
          hasNext: action.payload.hasNext,
          isLoading: false,
          items:
            action.payload.page > 0
              ? state.items.concat(action.payload.items)
              : action.payload.items
        }
    }
  }
}

export default function useSearch<T>(query: string, page = 0): State<T> {
  const searchReducer = createSearchReducer<T>()
  const [state, dispatch] = useReducer(searchReducer, {
    hasNext: true,
    isLoading: false,
    items: []
  })

  useEffect((): void => {
    dispatch({ type: 'SEARCH_INIT' })

    search<T>(query, { page })
      .then(({ hits: items, nbPages }): void => {
        dispatch({
          payload: {
            hasNext: nbPages > 1,
            items,
            page
          },
          type: 'SEARCH_SUCCESS'
        })
      })
      .catch((): void => {
        dispatch({ type: 'SEARCH_FAILURE' })
      })
  }, [query, page])

  return state
}
