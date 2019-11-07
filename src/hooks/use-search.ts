import { Response, QueryParameters } from 'algoliasearch'
import algoliasearch, { Index } from 'algoliasearch/lite'
import { useEffect, useState } from 'react'

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

type SearchResults<T> = {
  hasNext: boolean
  items: T[]
}

export default function useSearch<T>(
  query: string,
  page = 0
): SearchResults<T> {
  const [hasNext, setHasNext] = useState(true)
  const [items, setItems] = useState<T[]>([])

  useEffect((): void => {
    search<T>(query, { page })
      .then(({ hits, nbPages }): void => {
        setHasNext(nbPages > 1)

        if (page > 0) {
          setItems((previousItems): T[] => previousItems.concat(hits))
        } else {
          setItems(hits)
        }
      })
      .catch((): void => {
        setHasNext(false)
      })
  }, [query, page])

  return { hasNext, items }
}
