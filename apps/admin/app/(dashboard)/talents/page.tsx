import type { Metadata } from 'next'
import { TalentsList } from './_components/talents-list'
import { getTalents } from './_lib/get-talents'

export const metadata: Metadata = {
  title: 'タレント管理',
}

export default async function TalentsPage() {
  const talents = await getTalents()

  return <TalentsList talents={talents} />
}
