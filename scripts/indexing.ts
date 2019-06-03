import algoliasearch from 'algoliasearch'
import subDays from 'date-fns/subDays'
import { google } from 'googleapis'
import yargs from 'yargs'
import Video from '../types/video'

const { argv } = yargs
  .option('a', {
    alias: 'all',
    default: false,
    type: 'boolean'
  })
  .help()

const youtube = google.youtube({ version: 'v3' })

type SearchParams = {
  channelId: string
  pageToken: string
  publishedAfter: Date
  publishedBefore: Date
}

function search({
  channelId,
  pageToken,
  publishedAfter,
  publishedBefore
}: SearchParams) {
  return youtube.search.list({
    auth: process.env.GOOGLE_API_KEY,
    channelId,
    maxResults: 50,
    order: 'date',
    pageToken,
    part: 'snippet',
    publishedAfter: publishedAfter.toISOString(),
    publishedBefore: publishedBefore.toISOString(),
    safeSearch: 'none',
    type: 'video'
  })
}

function normalizeTitle(title: string) {
  return title.replace(/\s*【[^】]+\s*\/\s*あにまーれ】?\s*/, ' ').trim()
}

async function* getVideosByChannelId(
  channelId: string,
  all: boolean = false
): AsyncIterableIterator<Video> {
  let date = new Date()
  let pageToken = ''

  while (true) {
    const publishedAfter = subDays(date, 60)
    const response = await search({
      channelId,
      pageToken,
      publishedAfter,
      publishedBefore: date
    })

    if (
      !response.data ||
      !response.data.items ||
      (!pageToken && response.data.items.length < 1)
    )
      break

    for (const item of response.data.items) {
      const channelId = item.snippet!.channelId!
      const videoId = item.id!.videoId!

      yield {
        channel: {
          id: channelId,
          title: item.snippet!.channelTitle!,
          url: `https://www.youtube.com/channel/${channelId}`
        },
        id: videoId,
        objectID: videoId,
        publishedAt: new Date(item.snippet!.publishedAt!).getTime() / 1000,
        title: normalizeTitle(item.snippet!.title!),
        url: `https://www.youtube.com/watch?v=${videoId}`
      }
    }

    if (!all) break

    pageToken = response.data.nextPageToken || ''

    if (!pageToken) {
      date = new Date(publishedAfter.getTime() - 1)
    }
  }
}

async function main({ a: all }: { a: boolean }) {
  const channels = [
    // 因幡はねる
    'UC0Owc36U9lOyi9Gx9Ic-4qg',

    // 宇森ひなこ
    'UChqYnJlFxlBi6DfRz6jRenQ',

    // 宗谷いちか
    'UC2kyQhzGOB-JPgcQX9OMgEw',

    // 日ノ隈らん
    'UCRvpMpzAXBRKJQuk-8-Sdvg'
  ]
  const results: Video[] = []

  for (const channelId of channels) {
    for await (const video of getVideosByChannelId(channelId, all)) {
      results.push(video)
    }
  }

  const client = algoliasearch(
    process.env.ALGOLIA_APPLICATION_ID!,
    process.env.ALGOLIA_API_KEY!
  )
  const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME!)

  await index.addObjects(results)
}

main(argv).catch(error => console.error(error))
