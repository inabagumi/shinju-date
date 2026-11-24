import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestContext } from "../internal/testing/context.js";
import { createFakeTwitchFetcher } from "../internal/testing/fetcher.js";
import { postgresError, setupSupabase } from "../internal/testing/supabase.js";
import {
  createClip,
  createSavedArchive,
  createSavedVideo,
  createVideo,
} from "../internal/testing/twitch.js";
import type * as Thumbnails from "../internal/thumbnails/index.js";
import { createThumbnail } from "../internal/thumbnails/index.js";
import type { ErrorReporter } from "../types.js";
import {
  refreshRecentTwitchVideos,
  removeUnavailableTwitchVideos,
} from "./check-videos.js";

vi.mock(import("../internal/thumbnails/index.js"), async (importOriginal) => ({
  ...(await importOriginal()),
  createThumbnail: vi.fn<typeof Thumbnails.createThumbnail>(),
  removeThumbnail: vi.fn<typeof Thumbnails.removeThumbnail>(),
}));

const supabase = setupSupabase();
const now = Temporal.Instant.from("2024-05-01T12:00:00.500Z");
const reportError = vi.fn<ErrorReporter>();
const createContext = <T>(fetcher: T) =>
  createTestContext({
    fetcher,
    now,
    reportError,
    supabaseClient: supabase.supabaseClient,
  });

describe(refreshRecentTwitchVideos, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createThumbnail).mockResolvedValue({
      id: "thumb-new",
      path: "vod-1/x.jpg",
    });
  });

  it("loads the newest finished videos of active talents", async () => {
    supabase.respond(() => []);
    const { getVideos, fetcher } = createFakeTwitchFetcher();

    const changed = await refreshRecentTwitchVideos(createContext(fetcher));

    expect(changed).toBe(0);
    expect(getVideos).not.toHaveBeenCalled();
    expect(supabase.requests[0]?.query).toMatchObject({
      deleted_at: "is.null",
      limit: "100",
      order: "published_at.desc",
      platform: "eq.twitch",
      status: "in.(ENDED,PUBLISHED)",
      "talent.status": "eq.active",
    });
  });

  it("updates what changed on Twitch", async () => {
    supabase.respond(({ method }) =>
      method === "GET" ? [createSavedArchive()] : []
    );
    const { fetcher } = createFakeTwitchFetcher({
      videos: [createVideo({ duration: "PT2H30M", title: "Renamed" })],
    });

    const changed = await refreshRecentTwitchVideos(createContext(fetcher));

    expect(changed).toBeGreaterThan(0);
    expect(supabase.written("PATCH", "videos")).toStrictEqual([
      expect.objectContaining({
        body: {
          duration: "PT2H30M",
          title: "Renamed",
        },
        query: { id: "eq.video-1" },
      }),
    ]);
    expect(supabase.written("PATCH", "twitch_videos")).toHaveLength(0);
  });

  it("follows a video that changed its type", async () => {
    supabase.respond(({ method }) =>
      method === "GET" ? [createSavedArchive()] : []
    );
    const { fetcher } = createFakeTwitchFetcher({
      videos: [createVideo({ type: "highlight" })],
    });

    const changed = await refreshRecentTwitchVideos(createContext(fetcher));

    expect(changed).toBeGreaterThan(0);
    expect(supabase.written("PATCH", "twitch_videos")[0]).toMatchObject({
      body: { type: "highlight" },
      query: { id: "eq.twitch-row-1" },
    });
    // A highlight is no longer a broadcast.
    expect(supabase.written("PATCH", "videos")).toStrictEqual([
      expect.objectContaining({
        body: { video_kind: "standard" },
        query: { id: "eq.video-1" },
      }),
    ]);
  });

  // Every Twitch video used to be saved as `standard`.
  it.each([
    ["archive", createVideo(), "stream"],
    ["clip", createClip({ id: "vod-1", title: "Archive" }), "short"],
  ] as const)(
    "reclassifies a saved %s that was saved as a standard video",
    async (type, fetched, kind) => {
      supabase.respond(({ method }) =>
        method === "GET"
          ? [
              createSavedArchive({
                duration: fetched.duration,
                status: type === "clip" ? "PUBLISHED" : "ENDED",
                twitch_video: { type },
                video_kind: "standard",
              }),
            ]
          : []
      );
      const { fetcher } = createFakeTwitchFetcher(
        type === "clip" ? { clips: [fetched] } : { videos: [fetched] }
      );

      const changed = await refreshRecentTwitchVideos(createContext(fetcher));

      expect(changed).toBe(1);
      expect(supabase.written("PATCH", "videos")).toStrictEqual([
        expect.objectContaining({
          body: { video_kind: kind },
          query: { id: "eq.video-1" },
        }),
      ]);
      expect(supabase.written("PATCH", "twitch_videos")).toHaveLength(0);
    }
  );

  it("looks clips up separately from videos", async () => {
    supabase.respond(({ method }) =>
      method === "GET"
        ? [
            createSavedArchive(),
            createSavedArchive({
              duration: "PT30S",
              id: "video-2",
              status: "PUBLISHED",
              title: "Old clip title",
              video_kind: "short",
              twitch_video: {
                id: "twitch-row-2",
                stream_id: null,
                twitch_video_id: "clip-1",
                type: "clip",
              },
            }),
          ]
        : []
    );
    const { getClips, getVideos, fetcher } = createFakeTwitchFetcher({
      clips: [createClip()],
      videos: [createVideo()],
    });

    await refreshRecentTwitchVideos(createContext(fetcher));

    expect(getVideos).toHaveBeenCalledWith(["vod-1"]);
    expect(getClips).toHaveBeenCalledWith(["clip-1"]);
    expect(supabase.written("PATCH", "videos")).toStrictEqual([
      expect.objectContaining({
        body: { title: "Clip" },
        query: { id: "eq.video-2" },
      }),
    ]);
  });

  it("fills in a thumbnail Twitch did not have when the video was saved", async () => {
    supabase.respond(({ method }) =>
      method === "GET" ? [createSavedArchive({ thumbnail_id: null })] : []
    );
    const { fetcher } = createFakeTwitchFetcher({ videos: [createVideo()] });

    const changed = await refreshRecentTwitchVideos(createContext(fetcher));

    expect(changed).toBeGreaterThan(0);
    expect(createThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: "vod-1",
        source: expect.objectContaining({
          url: "https://cdn.test/vod-1280x720.jpg",
        }),
      })
    );
    expect(supabase.written("PATCH", "videos")[0]?.body).toStrictEqual({
      thumbnail_id: "thumb-new",
    });
  });

  it("updates what changed and fills in the missing thumbnail", async () => {
    supabase.respond(({ method }) =>
      method === "GET" ? [createSavedArchive({ thumbnail_id: null })] : []
    );
    const { fetcher } = createFakeTwitchFetcher({
      videos: [createVideo({ title: "Renamed" })],
    });

    const changed = await refreshRecentTwitchVideos(createContext(fetcher));

    expect(changed).toBe(1);
    expect(
      supabase.written("PATCH", "videos").map(({ body }) => body)
    ).toStrictEqual([{ title: "Renamed" }, { thumbnail_id: "thumb-new" }]);
  });

  it("removes the new thumbnail when the video cannot be updated", async () => {
    supabase.respond(({ method, table }) => {
      if (method === "GET") {
        return [createSavedArchive({ thumbnail_id: null })];
      }

      return table === "videos"
        ? postgresError("57014", "statement timeout")
        : [];
    });
    supabase.server.use(
      http.delete(
        "https://fake.supabase.test/storage/v1/object/thumbnails",
        () => HttpResponse.json([])
      )
    );
    const { fetcher } = createFakeTwitchFetcher({ videos: [createVideo()] });

    const changed = await refreshRecentTwitchVideos(createContext(fetcher));

    expect(changed).toBe(0);
    expect(
      supabase.written("DELETE", "thumbnails").map(({ query }) => query["id"])
    ).toStrictEqual(["eq.thumb-new"]);
    expect(reportError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: expect.stringContaining("statement timeout"),
      }),
      { twitchVideoId: "vod-1" }
    );
  });

  it("keeps the thumbnail a video already has", async () => {
    supabase.respond(({ method }) =>
      method === "GET" ? [createSavedArchive()] : []
    );
    const { fetcher } = createFakeTwitchFetcher({ videos: [createVideo()] });

    const changed = await refreshRecentTwitchVideos(createContext(fetcher));

    expect(changed).toBe(0);
    expect(createThumbnail).not.toHaveBeenCalled();
  });

  it("deletes videos Twitch no longer returns", async () => {
    supabase.respond(({ method, table }) => {
      if (method === "GET") {
        return [createSavedArchive()];
      }

      return table === "rpc/soft_delete_videos" ? ["video-1"] : [];
    });
    const { fetcher } = createFakeTwitchFetcher({ missingVideoIds: ["vod-1"] });

    const changed = await refreshRecentTwitchVideos(createContext(fetcher));

    expect(changed).toBeGreaterThan(0);
    // `soft_delete_videos` deletes the thumbnails with the videos.
    expect(
      supabase.written("POST", "rpc/soft_delete_videos")[0]?.body
    ).toMatchObject({ p_reason: "unavailable", p_video_ids: ["video-1"] });
    expect(supabase.written("PATCH", "thumbnails")).toHaveLength(0);
  });

  it("never looks up or deletes a broadcast that has no archive", async () => {
    supabase.respond(({ method }) =>
      method === "GET" ? [createSavedVideo({ status: "ENDED" })] : []
    );
    const { getVideos, fetcher } = createFakeTwitchFetcher();

    const changed = await refreshRecentTwitchVideos(createContext(fetcher));

    expect(changed).toBe(0);
    expect(getVideos).toHaveBeenCalledWith([]);
    expect(supabase.requests).toHaveLength(1);
  });
});

describe(removeUnavailableTwitchVideos, () => {
  it("walks every video page by page and deletes the missing ones", async () => {
    const cursors: (string | undefined)[] = [];
    supabase.respond(({ method, query, table }) => {
      if (method !== "GET") {
        return table === "rpc/soft_delete_videos" ? ["video-2"] : [];
      }

      cursors.push(query["id"]);

      if (query["id"]) {
        return [];
      }

      return [
        createSavedArchive(),
        createSavedArchive({
          id: "video-2",
          thumbnail_id: "thumb-2",
          twitch_video: {
            id: "twitch-row-2",
            stream_id: null,
            twitch_video_id: "clip-1",
            type: "clip",
          },
        }),
        createSavedVideo({ id: "video-3", status: "ENDED" }),
      ];
    });
    const { getClips, getVideos, fetcher } = createFakeTwitchFetcher({
      missingClipIds: ["clip-1"],
      videos: [createVideo()],
    });

    const changed = await removeUnavailableTwitchVideos(createContext(fetcher));

    expect({ changed: changed > 0, cursors }).toStrictEqual({
      changed: true,
      cursors: [undefined, "gt.video-3"],
    });
    expect({
      clips: getClips.mock.calls,
      videos: getVideos.mock.calls,
    }).toStrictEqual({
      clips: expect.arrayContaining([[["clip-1"]]]),
      videos: expect.arrayContaining([[["vod-1"]]]),
    });
    expect(supabase.written("POST", "rpc/soft_delete_videos")).toStrictEqual([
      expect.objectContaining({
        body: expect.objectContaining({ p_video_ids: ["video-2"] }),
      }),
    ]);
    expect(supabase.requests[0]?.query).toMatchObject({
      order: "id.asc",
      platform: "eq.twitch",
      "talent.deleted_at": "is.null",
    });
    expect(supabase.requests[0]?.query).not.toHaveProperty("talent.status");
  });

  it("reports no change when every video still exists", async () => {
    supabase.respond(({ method, query }) =>
      method === "GET" && !query["id"] ? [createSavedArchive()] : []
    );
    const { fetcher } = createFakeTwitchFetcher({ videos: [createVideo()] });

    const changed = await removeUnavailableTwitchVideos(createContext(fetcher));

    expect(changed).toBe(0);
    expect(supabase.written("PATCH", "videos")).toHaveLength(0);
  });
});
