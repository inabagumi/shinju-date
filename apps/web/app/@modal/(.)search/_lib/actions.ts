'use server'

import { redirect } from 'next/navigation'

export async function searchAction(formData: FormData) {
  const query = formData.get('q')

  if (typeof query === 'string' && query.trim()) {
    redirect(`/videos/${encodeURIComponent(query.trim())}`)
  }

  redirect('/videos')
}
