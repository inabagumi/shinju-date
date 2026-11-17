import type { Redis } from '@upstash/redis'
import { describe } from 'vitest'
import { FakeRedis } from '../../testing/index.js'
import { describeBackfillQueue } from './queue.js'
import { describeBackfillRuns } from './runs.js'

// The same tests as on Redis, so that FakeRedis (and the mock of Upstash in
// `@shinju-date/msw-handlers`, which emulates the scripts the same way) does
// what Redis does.
describe('on FakeRedis', () => {
  const createClient = () => new FakeRedis() as unknown as Redis

  describeBackfillQueue(createClient)
  describeBackfillRuns(createClient)
})
