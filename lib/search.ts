import algoliasearch from 'algoliasearch'

export default async function search<T = any>(query: string) {
  const client = algoliasearch(
    process.env.ALGOLIA_APPLICATION_ID!,
    process.env.ALGOLIA_API_KEY!
  )
  const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME!)

  return index.search<T>(query)
}
