import { type MetadataRoute } from 'next'
import { getAllChannels } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseURL = new URL(
    process.env['NEXT_PUBLIC_BASE_URL'] ?? 'http://localhost:3000'
  )
  const sitemapItems: MetadataRoute.Sitemap = [
    {
      changeFrequency: 'daily',
      priority: 1.0,
      url: new URL('/', baseURL).toString()
    },
    {
      changeFrequency: 'daily',
      priority: 0.7,
      url: new URL('/videos', baseURL).toString()
    },
    {
      changeFrequency: 'monthly',
      priority: 0.7,
      url: new URL('/about', baseURL).toString()
    },
    {
      changeFrequency: 'monthly',
      priority: 0.1,
      url: new URL('/privacy', baseURL).toString()
    },
    {
      changeFrequency: 'monthly',
      priority: 0.1,
      url: new URL('/terms', baseURL).toString()
    }
  ]

  for await (const channel of getAllChannels()) {
    sitemapItems.push({
      changeFrequency: 'daily',
      priority: 0.7,
      url: new URL(`/channels/${channel.slug}`, baseURL).toString()
    })
    sitemapItems.push({
      changeFrequency: 'daily',
      priority: 0.5,
      url: new URL(`/channels/${channel.slug}/videos`, baseURL).toString()
    })
  }

  return sitemapItems
}
