'use server'

import { track } from '@vercel/analytics/server'
import { redirect } from 'next/navigation'

export default async function search(formData: FormData): Promise<never> {
  const queries = formData.getAll('q')
  const query = queries.join(' ')

  await track('Search', { query })

  redirect(`/videos/${encodeURIComponent(query)}`)
}
