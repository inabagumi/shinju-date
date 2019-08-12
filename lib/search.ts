import algoliasearch, { Index, QueryParameters, Response } from 'algoliasearch'

const NORMALIZE_RE = /(\W)([bｂdｄgｇhｈkｋmｍnｎpｐrｒsｓtｔwｗyｙzｚ])($|\s)/g

export const normalize = (value: string): string =>
  value.replace(NORMALIZE_RE, (_, ...args): string => args[0] + args[2])

interface ParsedQuery {
  filters: string
  keywords: string[]
}

export const parseQuery = (query: string): ParsedQuery => {
  const keywords: string[] = []
  const channels: string[] = []

  query.split(/\s+/).forEach((keyword): void => {
    if (keyword.startsWith('from:')) {
      channels.push(keyword.slice(5))
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

export default async function search<T>(
  query: string,
  params: QueryParameters = {}
): Promise<Response<T>> {
  index = index || getIndex()

  const { keywords, filters } = parseQuery(query)

  return index.search<T>({
    filters,
    query: keywords.join(' '),
    hitsPerPage: 20,
    ...params
  })
}
