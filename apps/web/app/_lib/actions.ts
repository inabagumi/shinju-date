'use server'

import { track } from '@vercel/analytics/server'
import { redirect } from 'next/navigation'

export async function search(formData: FormData) {
  const query = formData.get('query')

  if (query && typeof query === 'string') {
    await track('Search', { query })

    redirect(`/videos/${encodeURIComponent(query)}`)
  } else {
    redirect('/videos')
  }
}
