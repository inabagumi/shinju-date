import type { Metadata } from 'next'
import { SITE_NAME } from '@/lib/site'

/** The Open Graph types the pages use. */
export type PageType = 'article' | 'profile' | 'website'

export interface PageMetadataOptions {
  /**
   * The whole `<title>` of the page, which the site name is not added to.
   *
   * Only the home page, whose `title` is the site name itself, sets it. Its
   * titles for sharing are then `title` alone, and `og:site_name`, which would
   * repeat it, is left out.
   */
  absoluteTitle?: string
  description?: string
  /** `false` keeps the page out of search engines. */
  index?: boolean
  /** The path of the canonical URL of the page. */
  path: string
  /** The title of the page, without the site name. */
  title: string
  type?: PageType
}

/**
 * What `createPageMetadata` returns. The parts are always set, so a page can
 * spread them to add its own fields.
 */
export interface PageMetadata extends Metadata {
  alternates: {
    canonical: string
  }
  openGraph: {
    description?: string
    siteName?: string
    title: string
    type: PageType
    url: string
  }
  twitter: {
    card: 'summary_large_image'
    title: string
  }
}

/**
 * The metadata every page has in common: the title, the canonical URL, and
 * the titles and the URL for Open Graph and X.
 *
 * Next.js does not make `og:url` from the canonical URL, so it is set to the
 * same path.
 *
 * The image is the `opengraph-image` file in the segment of each page, which
 * Next.js uses only when `openGraph` of the segment has no `images`, so they
 * are never set here. Next.js gives X the image of Open Graph, but not the
 * large card, which is set here.
 *
 * The root layout adds the site name to `title`, but not to the titles for
 * sharing. Open Graph has `og:site_name` for it, and X has nothing, so the
 * site name is added to the title for X here.
 */
export function createPageMetadata({
  absoluteTitle,
  description,
  index,
  path,
  title,
  type = 'website',
}: PageMetadataOptions): PageMetadata {
  const hasSiteName = absoluteTitle === undefined

  return {
    alternates: {
      canonical: path,
    },
    ...(description !== undefined && { description }),
    openGraph: {
      ...(description !== undefined && { description }),
      ...(hasSiteName && { siteName: SITE_NAME }),
      title,
      type,
      url: path,
    },
    ...(index !== undefined && { robots: { index } }),
    title: hasSiteName ? title : { absolute: absoluteTitle },
    twitter: {
      card: 'summary_large_image',
      title: hasSiteName ? `${title} - ${SITE_NAME}` : title,
    },
  }
}
