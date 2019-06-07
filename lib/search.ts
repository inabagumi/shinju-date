import algoliasearch, { QueryParameters } from 'algoliasearch'

const NORMALIZE_RE = /(?<!\w)[bｂdｄgｇhｈkｋmｍnｎpｐrｒsｓtｔwｗyｙzｚ](?=(?:$|\s))/

export const normalize = (value: string): string =>
  value.replace(NORMALIZE_RE, '')

export default async function search<T = any>(
  query: string,
  params: QueryParameters = {}
) {
  const client = algoliasearch(
    process.env.ALGOLIA_APPLICATION_ID!,
    process.env.ALGOLIA_API_KEY!
  )
  const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME!)

  return index.search<T>({ query, hitsPerPage: 20, ...params })
}
