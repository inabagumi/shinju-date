import { type SitemapItem, SitemapStream } from 'edge-sitemap'
import { NextResponse } from 'next/server'
import { getAllChannels, getAllGroups } from '@/lib/supabase'

const DEFINED_PAGES: SitemapItem[] = [
  {
    changefreq: 'daily',
    loc: '/',
    priority: 0.7
  },
  {
    changefreq: 'daily',
    loc: '/videos',
    priority: 0.7
  },
  {
    changefreq: 'monthly',
    loc: '/about',
    priority: 0.5
  },
  {
    changefreq: 'monthly',
    loc: '/privacy',
    priority: 0.5
  },
  {
    changefreq: 'monthly',
    loc: '/terms',
    priority: 0.5
  }
]

export const revalidate = 300

async function writeSitemap(
  writableStream: WritableStream<SitemapItem>
): Promise<void> {
  const writer = writableStream.getWriter()

  await writer.ready

  try {
    await Promise.all([
      ...DEFINED_PAGES.map((sitemapItem) => writer.write(sitemapItem)),
      getAllChannels().then((channels) =>
        Promise.all(
          channels.flatMap((channel) => [
            writer.write({
              changefreq: 'daily',
              loc: `/channels/${channel.slug}`,
              priority: 0.7
            }),
            writer.write({
              changefreq: 'daily',
              loc: `/channels/${channel.slug}/videos`,
              priority: 0.7
            })
          ])
        )
      ),
      getAllGroups().then((groups) =>
        Promise.all(
          groups.flatMap((group) => [
            writer.write({
              changefreq: 'daily',
              loc: `/groups/${group.slug}`,
              priority: 0.7
            }),
            writer.write({
              changefreq: 'daily',
              loc: `/groups/${group.slug}/videos`,
              priority: 0.7
            })
          ])
        )
      )
    ])
  } finally {
    await writer.close()
  }
}

export function GET(): NextResponse {
  const { readable: smReadable, writable: smWritable } = new SitemapStream({
    baseURL: new URL(process.env.NEXT_PUBLIC_BASE_URL)
  })
  const body = smReadable.pipeThrough(new TextEncoderStream())

  void writeSitemap(smWritable)

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8'
    }
  })
}
