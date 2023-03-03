import { type SitemapItem, SitemapStream } from 'edge-sitemap'
import { NextResponse } from 'next/server'
import { TextEncoderStream } from '@/lib/polyfills/encoding'
import { mix } from '@/lib/streams'
import { getAllChannels, getAllGroups } from '@/lib/supabase'

const DEFINED_PAGES: SitemapItem[] = [
  {
    changefreq: 'daily',
    loc: '/',
    priority: 1.0
  },
  {
    changefreq: 'daily',
    loc: '/videos',
    priority: 0.7
  },
  {
    changefreq: 'monthly',
    loc: '/about',
    priority: 0.7
  },
  {
    changefreq: 'monthly',
    loc: '/privacy',
    priority: 0.1
  },
  {
    changefreq: 'monthly',
    loc: '/terms',
    priority: 0.1
  }
]

export const runtime = 'edge'
export const revalidate = 86_400 // 1 day

function createDefinedPagesStream(): ReadableStream<SitemapItem> {
  return new ReadableStream<SitemapItem>({
    start(controller) {
      for (const sitemapItem of DEFINED_PAGES) {
        controller.enqueue(sitemapItem)
      }

      controller.close()
    }
  })
}

function createChannelsStream(): ReadableStream<SitemapItem> {
  const iterator = getAllChannels()

  return new ReadableStream<SitemapItem>({
    async pull(controller) {
      const { done, value: channel } = await iterator.next()

      if (channel) {
        controller.enqueue({
          changefreq: 'daily',
          loc: `/channels/${channel.slug}`,
          priority: 0.7
        })
        controller.enqueue({
          changefreq: 'daily',
          loc: `/channels/${channel.slug}/videos`,
          priority: 0.5
        })
      }

      if (done) {
        controller.close()
      }
    }
  })
}

function createGroupsStream(): ReadableStream<SitemapItem> {
  const iterator = getAllGroups()

  return new ReadableStream<SitemapItem>({
    async pull(controller) {
      const { done, value: group } = await iterator.next()

      if (group) {
        controller.enqueue({
          changefreq: 'daily',
          loc: `/groups/${group.slug}`,
          priority: 0.7
        })
        controller.enqueue({
          changefreq: 'daily',
          loc: `/groups/${group.slug}/videos`,
          priority: 0.5
        })
      }

      if (done) {
        controller.close()
      }
    }
  })
}

export function GET(): NextResponse {
  const baseURL = new URL(process.env.NEXT_PUBLIC_BASE_URL)
  const body = mix([
    createDefinedPagesStream(),
    createChannelsStream(),
    createGroupsStream()
  ])
    .pipeThrough(new SitemapStream({ baseURL }))
    .pipeThrough(new TextEncoderStream())

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8'
    }
  })
}
