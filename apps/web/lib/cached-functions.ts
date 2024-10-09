import { Temporal } from 'temporal-polyfill'

// eslint-disable-next-line @typescript-eslint/require-await
export async function getCurrentTime(): Promise<bigint> {
  'use cache'

  return Temporal.Now.instant().epochNanoseconds
}
