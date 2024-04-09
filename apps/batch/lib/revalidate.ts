const IS_PRODUCTION =
  process.env['NODE_ENV'] === 'production' &&
  process.env['VERCEL_ENV'] === 'production'
const REVALIDATE_URL = 'https://shinju.date/api/revalidate'

type RevalidateOptions = {
  signal?: AbortSignal | undefined
}

export async function revalidateTags(
  tags: string[],
  { signal }: RevalidateOptions = {}
): Promise<void> {
  if (!IS_PRODUCTION || tags.length < 1) {
    return
  }

  await fetch(REVALIDATE_URL, {
    body: JSON.stringify({ tags }),
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'POST',
    signal: signal ?? null
  })
}
