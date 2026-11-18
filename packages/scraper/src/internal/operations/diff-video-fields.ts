import { toDBString } from "@shinju-date/temporal-fns";

import type { VideoFields } from "../../types.js";

const VIDEO_FIELD_KEYS = [
  "duration",
  "published_at",
  "status",
  "title",
  "video_kind",
] as const satisfies readonly (keyof VideoFields)[];

/** The {@link VideoFields} that changed, with their value on each side. */
export interface VideoFieldChanges {
  after: Partial<VideoFields>;
  before: Partial<VideoFields>;
}

function isSameValue<K extends keyof VideoFields>(
  key: K,
  a: VideoFields[K],
  b: VideoFields[K]
): boolean {
  // The database and the platforms format the same instant differently, and
  // the database keeps whole seconds only (see `toDBString`).
  if (key === "published_at") {
    return (
      toDBString(Temporal.Instant.from(a)) ===
      toDBString(Temporal.Instant.from(b))
    );
  }

  return a === b;
}

function setValue<K extends keyof VideoFields>(
  target: Partial<VideoFields>,
  key: K,
  value: VideoFields[K]
): void {
  target[key] = value;
}

/**
 * Compares a saved video with its next state.
 *
 * Fields missing from either side are skipped: Twitch, for one, has no kinds,
 * so its saved videos are loaded without `video_kind`.
 *
 * @returns The fields that changed, with their value in `next`. Empty when the
 *   saved video is up to date.
 */
export function diffVideoFields(
  saved: Partial<VideoFields>,
  next: Partial<VideoFields>
): Partial<VideoFields> {
  const changes: Partial<VideoFields> = {};

  for (const key of VIDEO_FIELD_KEYS) {
    const savedValue = saved[key];
    const nextValue = next[key];

    if (
      savedValue !== undefined &&
      nextValue !== undefined &&
      !isSameValue(key, savedValue, nextValue)
    ) {
      setValue(changes, key, nextValue);
    }
  }

  return changes;
}

/**
 * {@link diffVideoFields} with the saved value of each changed field as well,
 * as `Scraper#refreshVideo` reports them.
 */
export function compareVideoFields(
  saved: Partial<VideoFields>,
  next: Partial<VideoFields>
): VideoFieldChanges {
  const after = diffVideoFields(saved, next);
  const before: Partial<VideoFields> = {};

  for (const key of VIDEO_FIELD_KEYS) {
    const savedValue = saved[key];

    if (key in after && savedValue !== undefined) {
      setValue(before, key, savedValue);
    }
  }

  return { after, before };
}
