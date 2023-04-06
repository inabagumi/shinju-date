import Scraper, { type ScraperOptions } from './scraper'

export function scrape(options: ScraperOptions) {
  const scraper = new Scraper(options)

  return scraper.scrape()
}

export { Scraper }
export { default as DB } from './db'
export * from './db'
export * from './helpers'
export * from './scraper'
export * from './types'
