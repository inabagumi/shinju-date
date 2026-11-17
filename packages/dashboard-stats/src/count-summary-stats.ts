import type { default as Database, Enums } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { SummaryStats } from './schema.js'

/**
 * Statuses of the videos that viewers can watch. A video is public when it is
 * visible and has one of these statuses.
 */
export const PUBLIC_VIDEO_STATUSES = [
  'ENDED',
  'LIVE',
  'PUBLISHED',
] as const satisfies readonly Enums<'video_status'>[]

export interface CountSummaryStatsOptions {
  /**
   * Count the rows as they were at this moment: rows created before it and
   * not deleted by then. When omitted, the rows are counted as they are now.
   */
  asOf?: Temporal.Instant | undefined
}

interface CountResult {
  count: number | null
  error: PostgrestError | null
}

/** The filters of a query of a table whose rows are deleted softly. */
interface ExistingRowsQuery<T> {
  is(column: 'deleted_at', value: null): T
  lt(column: 'created_at', value: string): T
  or(filters: string): T
}

/** The filters of a query that counts the rows deleted softly. */
interface DeletedRowsQuery<T> {
  lt(column: 'deleted_at', value: string): T
  not(column: 'deleted_at', operator: 'is', value: null): T
}

/**
 * Narrow a query down to the rows that existed at `asOf` (created before it
 * and not deleted by then), or to the rows not deleted when `asOf` is `null`.
 */
function existing<T extends ExistingRowsQuery<T>>(
  query: T,
  asOf: string | null,
): T {
  if (asOf === null) {
    return query.is('deleted_at', null)
  }

  return query
    .lt('created_at', asOf)
    .or(`deleted_at.is.null,deleted_at.gte.${asOf}`)
}

/** Narrow a query down to the rows deleted before `asOf`, or ever deleted. */
function deleted<T extends DeletedRowsQuery<T>>(
  query: T,
  asOf: string | null,
): T {
  const filtered = query.not('deleted_at', 'is', null)

  return asOf === null ? filtered : filtered.lt('deleted_at', asOf)
}

async function unwrapCount(
  name: keyof SummaryStats,
  query: PromiseLike<CountResult>,
): Promise<number> {
  const { count, error } = await query

  if (error) {
    throw new Error(`countSummaryStats.${name}: ${error.message}`, {
      cause: error,
    })
  }

  return count ?? 0
}

/**
 * Count the videos, terms and talents shown on the dashboard. The current
 * counts and the snapshots (`asOf`) use the same conditions, so that the
 * difference between them is a change of the rows themselves.
 *
 * Terms are deleted for good, so the count at `asOf` leaves out only the terms
 * created after it.
 */
export async function countSummaryStats(
  supabaseClient: SupabaseClient<Database>,
  { asOf }: CountSummaryStatsOptions = {},
): Promise<SummaryStats> {
  const asOfString = asOf ? toDBString(asOf) : null

  const countVideos = () =>
    supabaseClient.from('videos').select('*', { count: 'exact', head: true })

  const countTerms = () => {
    const query = supabaseClient
      .from('terms')
      .select('*', { count: 'exact', head: true })

    return asOfString === null ? query : query.lt('created_at', asOfString)
  }

  const [
    totalVideos,
    visibleVideos,
    scheduledVideos,
    hiddenVideos,
    deletedVideos,
    totalTerms,
    totalTalents,
  ] = await Promise.all([
    unwrapCount('totalVideos', existing(countVideos(), asOfString)),
    unwrapCount(
      'visibleVideos',
      existing(countVideos(), asOfString)
        .eq('visible', true)
        .in('status', PUBLIC_VIDEO_STATUSES),
    ),
    unwrapCount(
      'scheduledVideos',
      existing(countVideos(), asOfString)
        .eq('visible', true)
        .eq('status', 'UPCOMING'),
    ),
    unwrapCount(
      'hiddenVideos',
      existing(countVideos(), asOfString).eq('visible', false),
    ),
    unwrapCount('deletedVideos', deleted(countVideos(), asOfString)),
    unwrapCount('totalTerms', countTerms()),
    unwrapCount(
      'totalTalents',
      existing(
        supabaseClient
          .from('talents')
          .select('*', { count: 'exact', head: true }),
        asOfString,
      ),
    ),
  ])

  return {
    deletedVideos,
    hiddenVideos,
    scheduledVideos,
    totalTalents,
    totalTerms,
    totalVideos,
    visibleVideos,
  }
}
