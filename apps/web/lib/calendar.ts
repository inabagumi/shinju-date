import { max, min } from "@shinju-date/temporal-fns";
import {
  convertTimestampToArray,
  createEvents,
  type EventAttributes,
} from "ics";

import type { CalendarVideo } from "@/lib/data/videos";

import { SITE_NAME as siteName } from "./site";
import { getVideoUrl } from "./video-url";

/**
 * The calendar apps fetch the subscribed URLs periodically, so let the CDN
 * answer them for a while. The videos are cached for hours in
 * `fetchCalendarVideos` anyway.
 */
const CALENDAR_CACHE_CONTROL =
  "public, max-age=300, s-maxage=900, stale-while-revalidate=3600";

interface GetPublishedAtAndEndedAtOptions {
  now: Temporal.ZonedDateTime;
}

type GetPublishedAtAndEndedAtResult = [
  publishedAt: Temporal.ZonedDateTime,
  endedAt: Temporal.ZonedDateTime,
];

export function getPublishedAtAndEndedAt(
  video: CalendarVideo,
  { now }: GetPublishedAtAndEndedAtOptions
): GetPublishedAtAndEndedAtResult {
  const publishedAt = Temporal.Instant.from(
    video.published_at
  ).toZonedDateTimeISO(now.timeZoneId);
  const duration = Temporal.Duration.from(video.duration);
  const endedAt =
    duration.total({
      unit: "second",
    }) > 0
      ? publishedAt.add(duration)
      : min(
          max(
            publishedAt.add({
              hours: 1,
            }),
            now.add({
              minutes: 30,
            })
          ),
          publishedAt.add({
            hours: 12,
          })
        );

  return [publishedAt, endedAt];
}

export function createCalendarResponse(events: EventAttributes[]): Response {
  const { error, value } = createEvents(events);

  if (error && !value) {
    return new Response("500 Internal Server Error\n", {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=UTF-8",
      },
      status: 500,
    });
  }

  return new Response(value, {
    headers: {
      "Cache-Control": CALENDAR_CACHE_CONTROL,
      "Content-Type": "text/calendar; charset=UTF-8",
    },
  });
}

interface CreateEventAttributesListOptions {
  now: Temporal.ZonedDateTime;
}

export function createEventAttributesList(
  videos: CalendarVideo[],
  { now }: CreateEventAttributesListOptions
): EventAttributes[] {
  const events: EventAttributes[] = [];

  for (const video of videos) {
    const url = getVideoUrl(video);

    if (!url) {
      continue;
    }

    const [publishedAt, endedAt] = getPublishedAtAndEndedAt(video, {
      now,
    });
    const location = video.platform === "twitch" ? "Twitch" : "YouTube";

    events.push({
      calName: video.talent.name,
      description: url,
      end: convertTimestampToArray(endedAt.epochMilliseconds, "utc"),
      endInputType: "utc",
      endOutputType: "utc",
      location,
      productId: siteName,
      start: convertTimestampToArray(publishedAt.epochMilliseconds, "utc"),
      startInputType: "utc",
      startOutputType: "utc",
      title: video.title,
      uid: `${video.id}@shinju.date`,
      url,
    });
  }

  return events;
}
