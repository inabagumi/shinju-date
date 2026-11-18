import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestContext } from "../internal/testing/context.js";
import { createFakeTwitchFetcher } from "../internal/testing/fetcher.js";
import {
  alreadySaved,
  postgresError,
  setupSupabase,
} from "../internal/testing/supabase.js";
import {
  createSavedLiveVideo,
  createSavedVideo,
  createStream,
  createVideo,
  liveVideoRoutes,
} from "../internal/testing/twitch.js";
import { createThumbnail } from "../internal/thumbnails/index.js";
import { planLiveSync, syncTwitchLive } from "./sync-live.js";

vi.mock("../internal/thumbnails/index.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../internal/thumbnails/index.js")>()),
  createThumbnail: vi.fn(),
  removeThumbnail: vi.fn(),
}));

describe("planLiveSync", () => {
  const activeTwitchUserIds = new Set(["twitch-user-1"]);

  it("starts tracking a stream that just went on air", () => {
    const stream = createStream();

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [stream],
        savedByStreamId: [],
        savedLiveVideos: [],
      })
    ).toEqual({ ended: [], refreshed: [], started: [stream] });
  });

  it("ignores streams of accounts that are not crawled", () => {
    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream({ user_id: "twitch-user-9" })],
        savedByStreamId: [],
        savedLiveVideos: [],
      }).started
    ).toEqual([]);
  });

  it("leaves a broadcast that is still on air alone", () => {
    const saved = createSavedLiveVideo();

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream()],
        savedByStreamId: [saved],
        savedLiveVideos: [saved],
      })
    ).toEqual({ ended: [], refreshed: [], started: [] });
  });

  it("follows title changes during a broadcast", () => {
    const saved = createSavedLiveVideo();

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream({ title: "New title" })],
        savedByStreamId: [saved],
        savedLiveVideos: [saved],
      }).refreshed
    ).toEqual([{ saved, values: { title: "New title" } }]);
  });

  it("ends a broadcast whose stream went offline", () => {
    const saved = createSavedLiveVideo();

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [],
        savedByStreamId: [],
        savedLiveVideos: [saved],
      })
    ).toEqual({ ended: [saved], refreshed: [], started: [] });
  });

  it("ends only the broadcasts that went offline", () => {
    const onAir = createSavedLiveVideo();
    const offline = createSavedLiveVideo({
      id: "video-2",
      twitch_video: { id: "twitch-row-2", stream_id: "stream-2" },
    });

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream()],
        savedByStreamId: [onAir],
        savedLiveVideos: [onAir, offline],
      }).ended
    ).toEqual([offline]);
  });

  it("marks a row LIVE again when Twitch still reports its stream", () => {
    // Twitch can briefly stop listing a stream that is still on air, and an
    // archive can be saved as ENDED before its stream was seen.
    const saved = createSavedVideo({
      status: "ENDED",
      twitch_video: { twitch_video_id: "vod-1", type: "archive" },
    });

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream()],
        savedByStreamId: [saved],
        savedLiveVideos: [],
      })
    ).toEqual({
      ended: [],
      refreshed: [{ saved, values: { status: "LIVE" } }],
      started: [],
    });
  });

  it("never brings back a row that was deleted", () => {
    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream()],
        savedByStreamId: [
          createSavedVideo({
            deleted_at: "2024-05-01T10:00:00+00:00",
            status: "ENDED",
          }),
        ],
        savedLiveVideos: [],
      })
    ).toEqual({ ended: [], refreshed: [], started: [] });
  });

  it("ends a LIVE row that has no stream to check", () => {
    const saved = createSavedLiveVideo({ twitch_video: { stream_id: null } });

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream()],
        savedByStreamId: [],
        savedLiveVideos: [saved],
      }).ended
    ).toEqual([saved]);
  });
});

describe("syncTwitchLive", () => {
  const supabase = setupSupabase();
  const now = Temporal.Instant.from("2024-05-01T12:00:00.500Z");
  const reportError = vi.fn();
  const createContext = <T>(fetcher: T) =>
    createTestContext({
      fetcher,
      now,
      reportError,
      supabaseClient: supabase.supabaseClient,
    });

  let removedImages: unknown[];

  function deletedThumbnailIds(): (string | undefined)[] {
    return supabase
      .written("DELETE", "thumbnails")
      .map(({ query }) => query["id"]);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createThumbnail).mockResolvedValue({
      id: "thumb-new",
      path: "x/y.jpg",
    });
    removedImages = [];
    supabase.server.use(
      http.delete(
        "https://fake.supabase.test/storage/v1/object/thumbnails",
        async ({ request }) => {
          removedImages.push(await request.json());

          return HttpResponse.json([]);
        }
      )
    );
  });

  it("adds a LIVE row for a stream that just went on air", async () => {
    supabase.respondWith(liveVideoRoutes());
    const { getLiveStreams, fetcher } = createFakeTwitchFetcher({
      liveStreams: [createStream()],
    });

    const changed = await syncTwitchLive(createContext(fetcher));

    expect(changed).toBeGreaterThan(0);
    expect(getLiveStreams).toHaveBeenCalledWith(["twitch-user-1"]);
    expect(supabase.insertedVideos()[0]?.video).toMatchObject({
      created_at: "2024-05-01T12:00:00Z",
      duration: "P0D",
      platform: "twitch",
      published_at: "2024-05-01T09:00:00Z",
      status: "LIVE",
      talent_id: "talent-1",
      thumbnail_id: "thumb-new",
      title: "Live now",
    });
    expect(supabase.insertedVideos()[0]?.platformVideo).toMatchObject({
      stream_id: "stream-1",
      twitch_user_id: "user-row-1",
      twitch_video_id: "live:stream-1",
      type: null,
    });
    expect(createThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: "live:stream-1",
        source: expect.objectContaining({
          url: "https://cdn.test/live-1280x720.jpg",
        }),
      })
    );
  });

  it("changes nothing while a tracked broadcast stays on air", async () => {
    supabase.respondWith(liveVideoRoutes([createSavedLiveVideo()]));
    const { getRecentVideos, fetcher } = createFakeTwitchFetcher({
      liveStreams: [createStream()],
    });

    const changed = await syncTwitchLive(createContext(fetcher));

    expect(changed).toBe(0);
    expect(supabase.requests.every((request) => request.method === "GET")).toBe(
      true
    );
    expect(getRecentVideos).not.toHaveBeenCalled();
  });

  it("follows a title change", async () => {
    supabase.respondWith(liveVideoRoutes([createSavedLiveVideo()]));
    const { fetcher } = createFakeTwitchFetcher({
      liveStreams: [createStream({ title: "New title" })],
    });

    const changed = await syncTwitchLive(createContext(fetcher));

    expect(changed).toBeGreaterThan(0);
    expect(supabase.written("PATCH", "videos")[0]).toMatchObject({
      body: { title: "New title" },
      query: { id: "eq.video-1" },
    });
  });

  it("ends a broadcast and keeps the placeholder until the archive exists", async () => {
    supabase.respondWith(liveVideoRoutes([createSavedLiveVideo()]));
    const { getRecentVideos, fetcher } = createFakeTwitchFetcher();

    const changed = await syncTwitchLive(createContext(fetcher));

    expect(changed).toBeGreaterThan(0);
    expect(getRecentVideos).toHaveBeenCalledWith(["twitch-user-1"], {
      type: "archive",
    });
    expect(supabase.written("PATCH", "videos")[0]?.body).toEqual({
      status: "ENDED",
    });
    expect(supabase.written("PATCH", "twitch_videos")).toHaveLength(0);
  });

  it("ends a broadcast and takes over its archive", async () => {
    supabase.respondWith(liveVideoRoutes([createSavedLiveVideo()]));
    const { fetcher } = createFakeTwitchFetcher({
      archives: [
        createVideo({ id: "vod-other", stream_id: "stream-other" }),
        createVideo(),
      ],
    });

    await syncTwitchLive(createContext(fetcher));

    expect(supabase.written("PATCH", "twitch_videos")[0]).toMatchObject({
      body: { twitch_video_id: "vod-1", type: "archive" },
      query: { id: "eq.twitch-row-1" },
    });
    expect(supabase.written("PATCH", "videos")[0]?.body).toEqual({
      duration: "PT2H",
      published_at: "2024-05-01T09:00:00Z",
      status: "ENDED",
      thumbnail_id: "thumb-new",
      title: "Archive",
    });
    // Cached pages may still show the preview, so the cleanup removes it
    // later, counting from the time it was replaced (`touch_thumbnail`).
    expect(supabase.written("POST", "rpc/touch_thumbnail")).toEqual([
      expect.objectContaining({ body: { p_thumbnail_id: "thumb-live" } }),
    ]);
    expect(deletedThumbnailIds()).toEqual([]);
    expect(removedImages).toEqual([]);
  });

  it("removes the new thumbnail when the broadcast cannot be ended", async () => {
    supabase.respondWith({
      ...liveVideoRoutes([createSavedLiveVideo()]),
      "PATCH videos": () => postgresError("57014", "statement timeout"),
    });
    const { fetcher } = createFakeTwitchFetcher({ archives: [createVideo()] });

    const changed = await syncTwitchLive(createContext(fetcher));

    expect(changed).toBe(0);
    expect(deletedThumbnailIds()).toEqual(["eq.thumb-new"]);
    expect(removedImages).toEqual([{ prefixes: ["x/y.jpg"] }]);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("statement timeout"),
      }),
      { videoId: "video-1" }
    );
  });

  it("keeps the live thumbnail while the archive has none", async () => {
    supabase.respondWith(liveVideoRoutes([createSavedLiveVideo()]));
    const { fetcher } = createFakeTwitchFetcher({
      archives: [createVideo({ thumbnail_url: "" })],
    });

    await syncTwitchLive(createContext(fetcher));

    expect(createThumbnail).not.toHaveBeenCalled();
    expect(supabase.written("PATCH", "videos")[0]?.body).not.toHaveProperty(
      "thumbnail_id"
    );
    expect(supabase.written("PATCH", "thumbnails")).toEqual([]);
    expect(deletedThumbnailIds()).toEqual([]);
  });

  it("ends a broadcast whose archive was attached while on air", async () => {
    supabase.respondWith(
      liveVideoRoutes([
        createSavedLiveVideo({
          twitch_video: { twitch_video_id: "vod-1", type: "archive" },
        }),
      ])
    );
    const { fetcher } = createFakeTwitchFetcher({ archives: [createVideo()] });

    await syncTwitchLive(createContext(fetcher));

    expect(supabase.written("PATCH", "twitch_videos")).toHaveLength(0);
    expect(supabase.written("PATCH", "videos")[0]?.body).toMatchObject({
      duration: "PT2H",
      status: "ENDED",
    });
  });

  it("still ends broadcasts of accounts that are no longer crawled", async () => {
    supabase.respondWith(
      liveVideoRoutes([
        createSavedLiveVideo(
          { twitch_video: { stream_id: "stream-9" } },
          "twitch-user-9"
        ),
      ])
    );
    const { getLiveStreams, fetcher } = createFakeTwitchFetcher();

    await syncTwitchLive(createContext(fetcher));

    expect(getLiveStreams).toHaveBeenCalledWith([
      "twitch-user-1",
      "twitch-user-9",
    ]);
    expect(supabase.written("PATCH", "videos")[0]?.body).toMatchObject({
      status: "ENDED",
    });
  });

  it("ends a broadcast whose account is gone without asking Twitch", async () => {
    supabase.respondWith(liveVideoRoutes([createSavedLiveVideo({}, null)]));
    const { getRecentVideos, fetcher } = createFakeTwitchFetcher();

    await syncTwitchLive(createContext(fetcher));

    expect(getRecentVideos).not.toHaveBeenCalled();
    expect(supabase.written("PATCH", "videos")[0]?.body).toMatchObject({
      status: "ENDED",
    });
  });

  it("quietly skips a stream another run started tracking first", async () => {
    supabase.respondWith({
      ...liveVideoRoutes(),
      "POST rpc/insert_video": () => alreadySaved(),
    });
    const { fetcher } = createFakeTwitchFetcher({
      liveStreams: [createStream()],
    });

    const changed = await syncTwitchLive(createContext(fetcher));

    expect(changed).toBe(0);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("reports a broadcast that could not be ended and handles the rest", async () => {
    supabase.respondWith({
      ...liveVideoRoutes([
        createSavedLiveVideo(),
        createSavedLiveVideo({
          id: "video-2",
          twitch_video: { id: "twitch-row-2", stream_id: "stream-2" },
        }),
      ]),
      "PATCH videos": ({ query }) =>
        query["id"] === "eq.video-1"
          ? postgresError("40001", "could not serialize access")
          : [],
    });
    const { fetcher } = createFakeTwitchFetcher();

    const changed = await syncTwitchLive(createContext(fetcher));

    expect(changed).toBeGreaterThan(0);
    expect(supabase.written("PATCH", "videos")).toHaveLength(2);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("could not serialize access"),
      }),
      { videoId: "video-1" }
    );
  });
});
