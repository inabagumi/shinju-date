import { youtube_v3 as youtube } from '@googleapis/youtube'

export const youtubeClient = new youtube.Youtube({
  auth: process.env.GOOGLE_API_KEY,
  fetchImplementation: fetch
})
