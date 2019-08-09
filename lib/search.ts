import algoliasearch, { QueryParameters, Response } from 'algoliasearch'

const NORMALIZE_RE = /(\W)([bｂdｄgｇhｈkｋmｍnｎpｐrｒsｓtｔwｗyｙzｚ])($|\s)/g

export const normalize = (value: string): string =>
  value.replace(NORMALIZE_RE, (_, ...args): string => args[0] + args[2])

export default async function search<T>(
  query: string,
  params: QueryParameters = {}
): Promise<Response<T>> {
  const client = algoliasearch(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env.ALGOLIA_APPLICATION_ID!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env.ALGOLIA_API_KEY!
  )
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME!)

  return index.search<T>({ query, hitsPerPage: 20, ...params })
}
