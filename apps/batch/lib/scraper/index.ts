import Scraper, { type ScraperOptions } from './scraper'

/**
 * Scrapes videos from a YouTube channel using the AsyncDisposable pattern
 * @param options - The scraper options
 * @returns Array of saved video objects
 */
export async function scrape(options: ScraperOptions) {
  await using scraper = new Scraper(options)
  return scraper.scrape()
}

/**
 * Creates a new Scraper instance using the factory method
 * @param options - The scraper options
 * @returns A new Scraper instance
 */
export function createScraper(options: ScraperOptions): Scraper {
  return Scraper.create(options)
}

export { Scraper }
export * from './db'
export { default as DB } from './db'
export * from './errors'
export * from './scraper'
export * from './types'
