import { youtube_v3 as youtube } from '@googleapis/youtube'
import pLimit from 'p-limit'

const limit = pLimit(6)

function fetchWithCocurrencyLimit(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return limit(() => fetch(input, init))
}

export const youtubeClient = new youtube.Youtube({
  auth: process.env.GOOGLE_API_KEY,
  fetchImplementation: fetchWithCocurrencyLimit
})
