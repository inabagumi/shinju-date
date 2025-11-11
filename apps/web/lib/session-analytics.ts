'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { formatDate } from '@shinju-date/temporal-fns'
import { headers } from 'next/headers'
import { Temporal } from 'temporal-polyfill'
import { getRedisClient } from './redis'

// TTL settings for time-based session keys
const DAILY_TTL_SECONDS = 90 * 24 * 60 * 60 // 90 days

/**
 * Generate a simple session ID based on IP address and User-Agent
 * This creates a stable identifier for the same user session across pages
 */
async function generateSessionId(): Promise<string> {
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for') ||
    headersList.get('x-real-ip') ||
    'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  // Create a simple hash of IP + User-Agent to identify the session
  const sessionData = `${ip}-${userAgent}`

  // Simple hash function to create a short session ID
  let hash = 0
  for (let i = 0; i < sessionData.length; i++) {
    const char = sessionData.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36)
}

/**
 * Track a page visit (session activity)
 */
export async function trackPageVisit(): Promise<void> {
  try {
    const redisClient = getRedisClient()
    const sessionId = await generateSessionId()
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    const today = formatDate(now)

    const sessionTotalKey = `${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}${today}`

    const multi = redisClient.multi()

    // Track unique sessions using a set
    multi.sadd(sessionTotalKey, sessionId)
    multi.expire(sessionTotalKey, DAILY_TTL_SECONDS)

    await multi.exec()
  } catch (error) {
    // Log error but don't throw - we don't want analytics to break functionality
    logger.error('ページ訪問の追跡に失敗しました', { error })
  }
}

/**
 * Track that a session performed a search
 */
export async function trackSearchSession(query: string): Promise<void> {
  if (!query || query.trim().length === 0) {
    return
  }

  try {
    const redisClient = getRedisClient()
    const sessionId = await generateSessionId()
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    const today = formatDate(now)

    const sessionWithSearchKey = `${REDIS_KEYS.SESSIONS_WITH_SEARCH_PREFIX}${today}`
    const searchSessionsKey = `${REDIS_KEYS.SEARCH_SESSIONS_PREFIX}${today}`

    const multi = redisClient.multi()

    // Track unique sessions that performed searches
    multi.sadd(sessionWithSearchKey, sessionId)
    multi.expire(sessionWithSearchKey, DAILY_TTL_SECONDS)

    // Track total search count per session for repeat search rate
    multi.hincrby(searchSessionsKey, sessionId, 1)
    multi.expire(searchSessionsKey, DAILY_TTL_SECONDS)

    await multi.exec()
  } catch (error) {
    logger.error('検索セッションの追跡に失敗しました', { error })
  }
}

/**
 * Track that a user exited after searching without clicking any results
 */
export async function trackSearchExitWithoutClick(
  query: string,
): Promise<void> {
  if (!query || query.trim().length === 0) {
    return
  }

  const normalizedQuery = query.trim().toLowerCase()

  try {
    const redisClient = getRedisClient()
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    const today = formatDate(now)

    const exitKey = `${REDIS_KEYS.SEARCH_EXIT_WITHOUT_CLICK_PREFIX}${today}`

    const multi = redisClient.multi()

    // Increment exit count for this query
    multi.hincrby(exitKey, normalizedQuery, 1)
    multi.expire(exitKey, DAILY_TTL_SECONDS)

    await multi.exec()
  } catch (error) {
    logger.error('検索離脱の追跡に失敗しました', { error })
  }
}
