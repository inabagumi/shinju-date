import { Temporal } from 'temporal-polyfill'

export async function getCurrentTime(): Promise<bigint> {
  // 'use cache'

  return Temporal.Now.instant().epochNanoseconds
}
