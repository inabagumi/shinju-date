import { NextResponse } from 'next/server'
import { type SitemapItem, SitemapStream } from '@/lib/sitemap'
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

export function GET() {
  const { readable: smReadable, writable: smWritable } = new SitemapStream({
    baseURL: new URL(process.env.NEXT_PUBLIC_BASE_URL)
  })
  const body = smReadable.pipeThrough(new TextEncoderStream())

  const writer = smWritable.getWriter()

  void writer.ready
    .then(() => Promise.all([getAllChannels(), getAllGroups()]))
    .then(([channels, groups]) =>
      Promise.allSettled([
        ...DEFINED_PAGES.map((sitemapItem) => writer.write(sitemapItem)),
        ...channels.map((channel) =>
          writer.write({
            changefreq: 'daily',
            loc: `/channels/${channel.slug}`,
            priority: 0.7
          })
        ),
        ...channels.map((channel) =>
          writer.write({
            changefreq: 'daily',
            loc: `/channels/${channel.slug}/videos`,
            priority: 0.7
          })
        ),
        ...groups.map((group) =>
          writer.write({
            changefreq: 'daily',
            loc: `/groups/${group.slug}`,
            priority: 0.7
          })
        ),
        ...groups.map((group) =>
          writer.write({
            changefreq: 'daily',
            loc: `/groups/${group.slug}/videos`,
            priority: 0.7
          })
        )
      ])
    )
    .finally(() => {
      void writer.close()
    })

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8'
    }
  })
}
