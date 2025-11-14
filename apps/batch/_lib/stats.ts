import { REDIS_KEYS } from '@shinju-date/constants'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Upstash } from '@upstash/redis'

export type SummaryStats = {
  totalVideos: number
  visibleVideos: number
  hiddenVideos: number
  deletedVideos: number
  totalTerms: number
  totalTalents: number
}

export type AnalyticsSummary = {
  recentSearches: number
  totalPopularKeywords: number
  recentClicks: number
}

export async function getSummaryStats(
  supabaseClient: SupabaseClient,
  targetDayEnd: string,
): Promise<SummaryStats> {
  // Get total video count (videos that existed during the target day)
  // A video existed during the target day if:
  // - It was created before the end of the day (created_at < targetDayEnd)
  // - It was not deleted OR deleted after the target day (deleted_at is null OR deleted_at >= targetDayEnd)
  const { count: totalVideos, error: totalError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', targetDayEnd)
    .or(`deleted_at.is.null,deleted_at.gte.${targetDayEnd}`)

  if (totalError) {
    throw new TypeError(totalError.message, {
      cause: totalError,
    })
  }

  // Get visible video count (visible videos that existed during the target day)
  const { count: visibleVideos, error: visibleError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('visible', true)
    .lt('created_at', targetDayEnd)
    .or(`deleted_at.is.null,deleted_at.gte.${targetDayEnd}`)

  if (visibleError) {
    throw new TypeError(visibleError.message, {
      cause: visibleError,
    })
  }

  // Get hidden video count (hidden videos that existed during the target day)
  const { count: hiddenVideos, error: hiddenError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('visible', false)
    .lt('created_at', targetDayEnd)
    .or(`deleted_at.is.null,deleted_at.gte.${targetDayEnd}`)

  if (hiddenError) {
    throw new TypeError(hiddenError.message, {
      cause: hiddenError,
    })
  }

  // Get deleted video count (videos deleted before the end of target day)
  const { count: deletedVideos, error: deletedError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .not('deleted_at', 'is', null)
    .lt('deleted_at', targetDayEnd)

  if (deletedError) {
    throw new TypeError(deletedError.message, {
      cause: deletedError,
    })
  }

  // Get total terms count
  const { count: totalTerms, error: termsError } = await supabaseClient
    .from('terms')
    .select('*', { count: 'exact', head: true })

  if (termsError) {
    throw new TypeError(termsError.message, {
      cause: termsError,
    })
  }

  // Get total talents count (talents that existed during the target day)
  const { count: totalTalents, error: talentsError } = await supabaseClient
    .from('talents')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', targetDayEnd)
    .or(`deleted_at.is.null,deleted_at.gte.${targetDayEnd}`)

  if (talentsError) {
    throw new TypeError(talentsError.message, {
      cause: talentsError,
    })
  }

  return {
    deletedVideos: deletedVideos ?? 0,
    hiddenVideos: hiddenVideos ?? 0,
    totalTalents: totalTalents ?? 0,
    totalTerms: totalTerms ?? 0,
    totalVideos: totalVideos ?? 0,
    visibleVideos: visibleVideos ?? 0,
  }
}

export async function getAnalyticsSummary(
  redisClient: Upstash,
  dateKey: string,
): Promise<AnalyticsSummary> {
  // Get search volume for the target date
  const recentSearches = await redisClient.get<number>(
    `${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${dateKey}`,
  )

  // Get count of unique popular keywords
  const totalPopularKeywords = await redisClient.zcard(
    REDIS_KEYS.SEARCH_POPULAR,
  )

  // Get target date's click volume
  const clickKey = `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`
  const clickResults = await redisClient.zrange<string[]>(clickKey, 0, -1, {
    rev: false,
    withScores: true,
  })

  let recentClicks = 0
  for (let j = 1; j < clickResults.length; j += 2) {
    const scoreStr = clickResults[j]
    if (scoreStr) {
      recentClicks += Number.parseInt(scoreStr, 10)
    }
  }

  return {
    recentClicks,
    recentSearches: recentSearches ?? 0,
    totalPopularKeywords: totalPopularKeywords ?? 0,
  }
}
