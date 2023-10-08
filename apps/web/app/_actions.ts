'use server'

import { track } from '@vercel/analytics/server'
import { redirect } from 'next/navigation'

export async function search(formData: FormData) {
  const queries = formData.getAll('q')
  const query = queries.join(' ')

  await track('Search', { query })

  redirect(`/videos/${encodeURIComponent(query)}`)
}
