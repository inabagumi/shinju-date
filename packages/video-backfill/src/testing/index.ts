/**
 * Mocks of Redis for tests, development and E2E. Not for production code.
 */
export { FakeRedis } from './fake-redis.js'
export {
  getScriptName,
  type RedisCall,
  type RedisReply,
  SCRIPT_EMULATIONS,
  type ScriptEmulation,
} from './scripts.js'
