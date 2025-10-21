/**
 * One-time cleanup script to remove old analytics keys without TTL
 * based on their respective TTL periods.
 *
 * This script should be run after deploying the TTL changes to ensure
 * old data is properly cleaned up according to each key type's retention policy.
 */

import { REDIS_KEYS } from '@shinju-date/constants'
import { Redis } from '@upstash/redis'
import { Temporal } from 'temporal-polyfill'

// Initialize Redis client
const redis = new Redis({
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  url: process.env.UPSTASH_REDIS_REST_URL || '',
})

const TIME_ZONE = 'Asia/Tokyo'

async function main() {
  console.log('Starting cleanup of old analytics keys...')

  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()

  let deletedKeys = 0

  // Get all Redis keys matching analytics patterns
  // Daily and click keys: clean older than 90 days (matches their TTL)
  // Weekly keys: clean older than 35 days (matches their TTL)
  const keyPatterns = [
    {
      cutoffDays: 90,
      description: 'Daily search keys (90-day TTL)',
      pattern: `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}*`,
    },
    {
      cutoffDays: 35,
      description: 'Weekly search keys (35-day TTL)',
      pattern: `${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}*`,
    },
    {
      cutoffDays: 90,
      description: 'Video click keys (90-day TTL)',
      pattern: `${REDIS_KEYS.CLICK_VIDEO_PREFIX}*`,
    },
    {
      cutoffDays: 90,
      description: 'Channel click keys (90-day TTL)',
      pattern: `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}*`,
    },
  ]

  for (const { pattern, cutoffDays, description } of keyPatterns) {
    console.log(`\nScanning pattern: ${pattern} (${description})`)

    const cutoffDate = today.subtract({ days: cutoffDays })
    console.log(
      `  Cutoff date: ${cutoffDate.toString()} (${cutoffDays} days ago)`,
    )

    try {
      // Use SCAN to get all keys matching the pattern
      let cursor = 0
      do {
        const result = await redis.scan(cursor, { count: 100, match: pattern })
        cursor = result[0]
        const keys = result[1] as string[]

        for (const key of keys) {
          try {
            // Extract date from key
            const dateStr = key.split(':').pop()
            if (!dateStr || dateStr.length !== 8) continue

            // Parse date (format: YYYYMMDD)
            const year = parseInt(dateStr.substring(0, 4), 10)
            const month = parseInt(dateStr.substring(4, 6), 10)
            const day = parseInt(dateStr.substring(6, 8), 10)

            const keyDate = Temporal.PlainDate.from({ day, month, year })

            // Check if key is older than cutoff
            if (Temporal.PlainDate.compare(keyDate, cutoffDate) < 0) {
              // Check if key has TTL
              const ttl = await redis.ttl(key)

              if (ttl === -1) {
                // Key has no TTL, delete it
                await redis.del(key)
                deletedKeys++
                console.log(
                  `  Deleted old key: ${key} (date: ${keyDate.toString()})`,
                )
              } else {
                console.log(`  Skipped key with TTL: ${key} (TTL: ${ttl}s)`)
              }
            }
          } catch (error) {
            console.error(`  Error processing key ${key}:`, error)
          }
        }
      } while (cursor !== 0)
    } catch (error) {
      console.error(`Error scanning pattern ${pattern}:`, error)
    }
  }

  console.log(`\nCleanup completed. Deleted ${deletedKeys} old keys.`)
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Cleanup script failed:', error)
    process.exit(1)
  })
}
