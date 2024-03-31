export async function revalidateTags(tags: string[]): Promise<void> {
  if (process.env['VERCEL_ENV'] !== 'production') {
    return
  }

  const formData = new FormData()

  for (const tag of tags) {
    formData.append('tag', tag)
  }

  const res = await fetch('https://shinju.date/api/revalidate', {
    body: formData,
    method: 'POST'
  })

  if (!res.ok) {
    throw new TypeError('Revalidate failed.')
  }
}
