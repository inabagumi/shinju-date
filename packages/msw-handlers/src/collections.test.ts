import { describe, expect, it } from "vitest";

import {
  announcements,
  auditLogs,
  featureRequests,
  profileImages,
  seedCollections,
  talents,
  terms,
  thumbnails,
  twitchUsers,
  twitchVideos,
  videoBackfillJobs,
  videos,
  youtubeChannels,
  youtubeVideos,
} from "./collections.js";

const COLLECTIONS = {
  announcements,
  auditLogs,
  featureRequests,
  profileImages,
  talents,
  terms,
  thumbnails,
  twitchUsers,
  twitchVideos,
  videoBackfillJobs,
  videos,
  youtubeChannels,
  youtubeVideos,
};

/** The rows of every collection, as plain JSON. */
function dumpCollections(): Record<string, unknown[]> {
  return JSON.parse(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(COLLECTIONS).map(([name, collection]) => [
          name,
          collection.findMany(),
        ])
      )
    )
  );
}

/** The values of every row that look like a time (an ISO 8601 string). */
function getTimestamps(dump: Record<string, unknown[]>): string[] {
  return Object.values(dump)
    .flat()
    .flatMap((row) => Object.values(row as Record<string, unknown>))
    .filter(
      (value): value is string =>
        typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)
    );
}

const NOW = Temporal.Instant.from("2026-11-15T12:34:56.789Z");

describe("seedCollections", () => {
  it("seeds the same data for the same now", async () => {
    await seedCollections({ now: NOW });
    const first = dumpCollections();

    await seedCollections({ now: NOW });
    const second = dumpCollections();

    expect(second).toEqual(first);
  });

  it("seeds every collection", async () => {
    await seedCollections({ now: NOW });

    for (const [name, rows] of Object.entries(dumpCollections())) {
      expect(rows.length, name).toBeGreaterThan(0);
    }
  });

  it("seeds data around the given now", async () => {
    await seedCollections({ now: NOW });
    const first = dumpCollections();

    await seedCollections({ now: NOW.add({ hours: 24 * 7 }) });

    expect(dumpCollections()).not.toEqual(first);
  });

  it("saves the times in seconds, without milliseconds", async () => {
    await seedCollections({ now: NOW });

    const timestamps = getTimestamps(dumpCollections());

    expect(timestamps.length).toBeGreaterThan(0);

    for (const timestamp of timestamps) {
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    }
  });

  it("links every video on YouTube to the channel of its talent", async () => {
    await seedCollections({ now: NOW });

    const channels = new Map(
      youtubeChannels.findMany().map((channel) => [channel.id, channel])
    );
    const savedVideos = new Map(
      videos.findMany().map((video) => [video.id, video])
    );

    for (const youtubeVideo of youtubeVideos.findMany()) {
      expect(channels.get(youtubeVideo.youtube_channel_id)?.talent_id).toBe(
        savedVideos.get(youtubeVideo.video_id)?.talent_id
      );
    }

    expect(youtubeVideos.findMany()).toHaveLength(
      videos.findMany().filter((video) => video.platform === "youtube").length
    );
  });
});
