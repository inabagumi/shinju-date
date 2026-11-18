import type { Metadata } from 'next'
import siteImage from '@/app/opengraph-image.jpg'
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
  /**
   * `true` when the segment of the page has its own `opengraph-image` file,
   * which is then used in place of the image of the site.
   *
   * Next.js uses the file only when the `openGraph` of the page has no
   * `images`, so the image of the site is left out of it.
   */
  hasOwnImage?: boolean
  /** `false` keeps the page out of search engines. */
  index?: boolean
  /** The path of the canonical URL of the page. */
  path: string
  /** The title of the page, without the site name. */
  title: string
  type?: PageType
}

interface OpenGraphImage {
  height: number
  type: string
  url: string
  width: number
}

/**
 * The image of the site, for the pages that have no image of their own.
 *
 * `app/opengraph-image.jpg` is the image of the root segment only. Next.js
 * merges the metadata of the segments shallowly, so a page that sets
 * `openGraph` replaces it, `images` included. The pages set it again here.
 */
const SITE_IMAGE: OpenGraphImage = {
  height: siteImage.height,
  type: 'image/jpeg',
  url: siteImage.src,
  width: siteImage.width,
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
    images?: OpenGraphImage[]
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
 * the titles, the URL and the image for Open Graph and X.
 *
 * Next.js does not make `og:url` from the canonical URL, so it is set to the
 * same path. Next.js gives X the image of Open Graph, but not the large card,
 * which is set here.
 *
 * The root layout adds the site name to `title`, but not to the titles for
 * sharing. Open Graph has `og:site_name` for it, and X has nothing, so the
 * site name is added to the title for X here.
 */
export function createPageMetadata({
  absoluteTitle,
  description,
  hasOwnImage = false,
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
      ...(!hasOwnImage && { images: [SITE_IMAGE] }),
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
