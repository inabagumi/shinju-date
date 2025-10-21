#!/usr/bin/env node
/**
 * One-time cleanup script to remove old analytics keys without TTL
 * that are older than 90 days.
 * 
 * This script should be run after deploying the TTL changes to ensure
 * old data is properly cleaned up.
 */

import { REDIS_KEYS } from '@shinju-date/constants'
import { Redis } from '@upstash/redis'
import { Temporal } from 'temporal-polyfill'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const TIME_ZONE = 'Asia/Tokyo'
const CUTOFF_DAYS = 90

async function main() {
  console.log('Starting cleanup of old analytics keys...')
  
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  const cutoffDate = today.subtract({ days: CUTOFF_DAYS })
  
  console.log(`Removing keys older than ${cutoffDate.toString()} (${CUTOFF_DAYS} days ago)`)
  
  let deletedKeys = 0
  
  // Get all Redis keys matching analytics patterns
  const keyPatterns = [
    `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}*`,
    `${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}*`,
    `${REDIS_KEYS.CLICK_VIDEO_PREFIX}*`,
    `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}*`,
  ]
  
  for (const pattern of keyPatterns) {
    console.log(`\nScanning pattern: ${pattern}`)
    
    try {
      // Use SCAN to get all keys matching the pattern
      let cursor = 0
      do {
        const result = await redis.scan(cursor, { match: pattern, count: 100 })
        cursor = result[0]
        const keys = result[1] as string[]
        
        for (const key of keys) {
          try {
            // Extract date from key
            const dateStr = key.split(':').pop()
            if (!dateStr || dateStr.length !== 8) continue
            
            // Parse date (format: YYYYMMDD)
            const year = parseInt(dateStr.substring(0, 4))
            const month = parseInt(dateStr.substring(4, 6))
            const day = parseInt(dateStr.substring(6, 8))
            
            const keyDate = Temporal.PlainDate.from({ year, month, day })
            
            // Check if key is older than cutoff
            if (keyDate.compare(cutoffDate) < 0) {
              // Check if key has TTL
              const ttl = await redis.ttl(key)
              
              if (ttl === -1) {
                // Key has no TTL, delete it
                await redis.del(key)
                deletedKeys++
                console.log(`Deleted old key: ${key} (date: ${keyDate.toString()})`)
              } else {
                console.log(`Skipped key with TTL: ${key} (TTL: ${ttl}s)`)
              }
            }
          } catch (error) {
            console.error(`Error processing key ${key}:`, error)
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