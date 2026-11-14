import type {
  CrawlContext,
  ErrorReporter,
  TypedSupabaseClient,
} from '../../types.js'

/** The time crawl tests run at; rows get `2024-05-01T12:00:00Z`. */
export const TEST_NOW = Temporal.Instant.from('2024-05-01T12:00:00.500Z')

export interface TestContextOptions<TFetcher> {
  fetcher: TFetcher
  now?: Temporal.Instant
  reportError: ErrorReporter
  supabaseClient: TypedSupabaseClient
}

/**
 * Builds the context a crawl operation runs with, with a silent logger.
 */
export function createTestContext<TFetcher>({
  fetcher,
  now = TEST_NOW,
  reportError,
  supabaseClient,
}: TestContextOptions<TFetcher>): CrawlContext<TFetcher> {
  return {
    fetcher,
    logger: { debug() {}, error() {}, info() {}, warn() {} },
    now,
    reportError,
    supabaseClient,
  }
}
