import { Redis } from '@upstash/redis'
import { describe } from 'vitest'
import { describeBackfillQueue } from './queue.js'
import { describeBackfillRuns } from './runs.js'

// The REST API of Upstash, or Serverless Redis HTTP in front of Redis
// (`compose.yml`, and the `services` of the test job in CI).
const url = process.env['UPSTASH_REDIS_REST_URL']
const token = process.env['UPSTASH_REDIS_REST_TOKEN']

describe.skipIf(!url || !token)('on Redis', () => {
  const createClient = () => new Redis({ token: token ?? '', url: url ?? '' })

  describeBackfillQueue(createClient)
  describeBackfillRuns(createClient)
})
