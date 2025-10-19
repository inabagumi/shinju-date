import { TermsList } from './_components/terms-list'
import getTerms from './_lib/get-terms'

export default async function TermsPage() {
  const terms = await getTerms()

  return <TermsList terms={terms} />
}
