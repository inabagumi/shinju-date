import { QueriesList } from './_components/queries-list'
import getRecommendedQueries from './_lib/get-recommended-queries'

export default async function RecommendedQueriesPage() {
  const queries = await getRecommendedQueries()

  return <QueriesList queries={queries} />
}
