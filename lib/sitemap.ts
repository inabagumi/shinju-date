export type SitemapChangeFreq =
  | 'always'
  | 'daily'
  | 'hourly'
  | 'monthly'
  | 'never'
  | 'weekly'
  | 'yearly'

export type SitemapItem = {
  changefreq?: SitemapChangeFreq
  lastmod?: `${number}-${number}-${number}`
  loc: URL | string
  priority?: number
}

export type SitemapStreamOptions = {
  baseURL: URL
}

export class SitemapStream extends TransformStream<SitemapItem, string> {
  constructor({ baseURL }: SitemapStreamOptions) {
    super({
      flush(controller) {
        controller.enqueue('</urlset>\n')
      },
      start(controller) {
        controller.enqueue('<?xml version="1.0" encoding="UTF-8"?>\n')
        controller.enqueue(
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        )
      },
      transform(chunk, controller) {
        controller.enqueue('  <url>\n')

        if (chunk.changefreq) {
          controller.enqueue(
            `    <changefreq>${chunk.changefreq}</changefreq>\n`
          )
        }

        if (chunk.lastmod) {
          controller.enqueue(`    <lastmod>${chunk.lastmod}</lastmod>\n`)
        }

        controller.enqueue(
          `    <loc>${new URL(chunk.loc, baseURL).toString()}</loc>\n`
        )

        if (chunk.priority) {
          controller.enqueue(
            `    <priority>${chunk.priority.toFixed(1)}</priority>\n`
          )
        }

        controller.enqueue('  </url>\n')
      }
    })
  }
}
