import { toDBString } from '@shinju-date/temporal-fns'
import type { VideoFields } from '../types.js'

const VIDEO_FIELD_KEYS = [
  'duration',
  'published_at',
  'status',
  'title',
  'video_kind',
] as const satisfies readonly (keyof VideoFields)[]

export interface VideoFieldsDiff {
  after: Partial<VideoFields>
  before: Partial<VideoFields>
}

function isSameValue<K extends keyof VideoFields>(
  key: K,
  a: VideoFields[K],
  b: VideoFields[K],
): boolean {
  // The database and the platforms format the same instant differently.
  if (key === 'published_at') {
    return (
      toDBString(Temporal.Instant.from(a)) ===
      toDBString(Temporal.Instant.from(b))
    )
  }

  return a === b
}

function collectChange<K extends keyof VideoFields>(
  diff: VideoFieldsDiff,
  key: K,
  before: Partial<VideoFields>,
  after: Partial<VideoFields>,
): void {
  const beforeValue = before[key]
  const afterValue = after[key]

  if (
    beforeValue === undefined ||
    afterValue === undefined ||
    isSameValue(key, beforeValue, afterValue)
  ) {
    return
  }

  diff.before[key] = beforeValue
  diff.after[key] = afterValue
}

/**
 * Lists the {@link VideoFields} that differ between two states of a video,
 * with their value in each. Fields missing from either side are skipped.
 */
export function diffVideoFields(
  before: Partial<VideoFields>,
  after: Partial<VideoFields>,
): VideoFieldsDiff {
  const diff: VideoFieldsDiff = { after: {}, before: {} }

  for (const key of VIDEO_FIELD_KEYS) {
    collectChange(diff, key, before, after)
  }

  return diff
}
