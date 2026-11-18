import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { DatabaseError } from "../database-error.js";
import {
  alreadySaved,
  postgresError,
  setupSupabase,
} from "../testing/supabase.js";
import {
  findSavedYouTubeVideoIds,
  insertVideo,
  softDeleteUnavailableVideos,
} from "./videos.js";

const supabase = setupSupabase();

const video = {
  duration: "PT10M",
  platform: "youtube" as const,
  published_at: "2024-01-01T00:00:00Z",
  status: "PUBLISHED" as const,
  talent_id: "talent-1",
  title: "Video",
};
const youtubeVideo = {
  platform: "youtube" as const,
  values: { youtube_channel_id: "channel-row-1", youtube_video_id: "yt-1" },
};

describe(insertVideo, () => {
  it("inserts the video and its platform row with one function call", async () => {
    supabase.respondWith({
      "POST rpc/insert_video": () => HttpResponse.json("video-1"),
    });

    const videoId = await insertVideo(
      supabase.supabaseClient,
      video,
      youtubeVideo
    );

    expect(videoId).toBe("video-1");
    expect(
      supabase.requests.map((r) => `${r.method} ${r.table}`)
    ).toStrictEqual(["POST rpc/insert_video"]);
    expect(supabase.requests[0]?.body).toStrictEqual({
      p_platform: "youtube",
      p_platform_video: {
        youtube_channel_id: "channel-row-1",
        youtube_video_id: "yt-1",
      },
      p_video: video,
    });
  });

  it("passes Twitch videos with their twitch_videos row", async () => {
    supabase.respondWith({});

    await insertVideo(
      supabase.supabaseClient,
      { ...video, platform: "twitch" },
      {
        platform: "twitch",
        values: {
          stream_id: "stream-1",
          twitch_user_id: "user-row-1",
          twitch_video_id: "live:stream-1",
          type: null,
        },
      }
    );

    expect(supabase.insertedVideos()).toStrictEqual([
      {
        platform: "twitch",
        platformVideo: {
          stream_id: "stream-1",
          twitch_user_id: "user-row-1",
          twitch_video_id: "live:stream-1",
          type: null,
        },
        video: { ...video, platform: "twitch" },
      },
    ]);
  });

  it("returns null when another run already saved the platform video", async () => {
    supabase.respondWith({ "POST rpc/insert_video": () => alreadySaved() });

    await expect(
      insertVideo(supabase.supabaseClient, video, youtubeVideo)
    ).resolves.toBeNull();
    expect(supabase.requests).toHaveLength(1);
  });

  it("throws a DatabaseError and removes nothing when the function fails", async () => {
    supabase.respondWith({
      "POST rpc/insert_video": () =>
        postgresError("23503", "violates foreign key constraint"),
    });

    await expect(
      insertVideo(supabase.supabaseClient, video, youtubeVideo)
    ).rejects.toThrow(DatabaseError);
    await expect(
      insertVideo(supabase.supabaseClient, video, youtubeVideo)
    ).rejects.toThrow(
      "Failed to insert a youtube video: violates foreign key constraint"
    );
    // The function inserts nothing when it fails, so nothing is undone.
    expect(
      supabase.requests.every(({ table }) => table === "rpc/insert_video")
    ).toBeTruthy();
  });
});

describe(softDeleteUnavailableVideos, () => {
  const now = Temporal.Instant.from("2024-05-01T12:34:56.789Z");

  it("soft-deletes the videos as unavailable with one function call", async () => {
    supabase.respond(() => ["video-1", "video-2"]);

    const deletedCount = await softDeleteUnavailableVideos(
      supabase.supabaseClient,
      { now, videoIds: ["video-1", "video-2"] }
    );

    expect(deletedCount).toBe(2);
    expect(
      supabase.requests.map((r) => `${r.method} ${r.table}`)
    ).toStrictEqual(["POST rpc/soft_delete_videos"]);
    expect(supabase.requests[0]?.body).toStrictEqual({
      p_deleted_at: "2024-05-01T12:34:56Z",
      p_reason: "unavailable",
      p_video_ids: ["video-1", "video-2"],
    });
  });

  it("counts only the videos the function deleted", async () => {
    // The function leaves the videos deleted meanwhile untouched.
    supabase.respond(() => ["video-2"]);

    const deletedCount = await softDeleteUnavailableVideos(
      supabase.supabaseClient,
      { now, videoIds: ["video-1", "video-2"] }
    );

    expect(deletedCount).toBe(1);
  });

  it("splits long ID lists into calls of 1,000 videos", async () => {
    supabase.respond(() => []);

    await softDeleteUnavailableVideos(supabase.supabaseClient, {
      now,
      videoIds: Array.from({ length: 2500 }, (_, i) => `video-${i}`),
    });

    expect(
      supabase
        .written("POST", "rpc/soft_delete_videos")
        .map(
          ({ body }) => (body as { p_video_ids: string[] }).p_video_ids.length
        )
    ).toStrictEqual([1000, 1000, 500]);
  });

  it("throws a DatabaseError when the function fails", async () => {
    supabase.respond(() => postgresError("XX000", "Database error"));

    await expect(
      softDeleteUnavailableVideos(supabase.supabaseClient, {
        now,
        videoIds: ["video-1"],
      })
    ).rejects.toThrow(DatabaseError);
  });

  it("does nothing without IDs", async () => {
    supabase.respond(() => []);

    await softDeleteUnavailableVideos(supabase.supabaseClient, {
      now,
      videoIds: [],
    });

    expect(supabase.requests).toHaveLength(0);
  });
});

describe(findSavedYouTubeVideoIds, () => {
  it("returns the IDs that are saved", async () => {
    supabase.respond(() => [{ youtube_video_id: "yt-1" }]);

    const savedIds = await findSavedYouTubeVideoIds(supabase.supabaseClient, [
      "yt-1",
      "yt-2",
    ]);

    expect([...savedIds]).toStrictEqual(["yt-1"]);
    expect(supabase.requests[0]?.query["youtube_video_id"]).toBe(
      "in.(yt-1,yt-2)"
    );
  });
});
