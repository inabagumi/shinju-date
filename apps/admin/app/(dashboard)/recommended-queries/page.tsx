import { QueriesList } from './_components/queries-list'
import getRecommendedQueries from './_lib/get-recommended-queries'

export default async function RecommendedQueriesPage() {
  const { manual, auto } = await getRecommendedQueries()

  return <QueriesList autoQueries={auto} manualQueries={manual} />
}
