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
  createSavedVideo,
  createStream,
  createVideo,
  findSavedVideos,
  TWITCH_TALENTS,
} from "../internal/testing/twitch.js";
import { createThumbnail } from "../internal/thumbnails/index.js";
import { addNewTwitchVideos, planNewVideos } from "./add-new-videos.js";

vi.mock("../internal/thumbnails/index.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../internal/thumbnails/index.js")>()),
  createThumbnail: vi.fn(),
  removeThumbnail: vi.fn(),
}));

describe("planNewVideos", () => {
  const archive = createVideo();
  const placeholder = createSavedVideo();

  it("inserts a video that is not saved", () => {
    expect(
      planNewVideos({
        liveStreams: [],
        savedByStreamId: [],
        savedByVideoId: [],
        videos: [archive],
      })
    ).toEqual([{ kind: "insert", liveStream: undefined, video: archive }]);
  });

  it("skips a video that is already saved", () => {
    const saved = createSavedVideo({
      status: "ENDED",
      twitch_video: { twitch_video_id: "vod-1", type: "archive" },
    });

    expect(
      planNewVideos({
        liveStreams: [],
        savedByStreamId: [saved],
        savedByVideoId: [saved],
        videos: [archive],
      })
    ).toEqual([]);
  });

  it("attaches an archive to the placeholder of its broadcast", () => {
    expect(
      planNewVideos({
        liveStreams: [],
        savedByStreamId: [placeholder],
        savedByVideoId: [],
        videos: [archive],
      })
    ).toEqual([
      {
        kind: "link",
        liveStream: undefined,
        saved: placeholder,
        video: archive,
      },
    ]);
  });

  it("flags an archive whose broadcast is still on air", () => {
    const stream = createStream();

    expect(
      planNewVideos({
        liveStreams: [stream],
        savedByStreamId: [placeholder],
        savedByVideoId: [],
        videos: [archive],
      })
    ).toEqual([
      { kind: "link", liveStream: stream, saved: placeholder, video: archive },
    ]);
    expect(
      planNewVideos({
        liveStreams: [stream],
        savedByStreamId: [],
        savedByVideoId: [],
        videos: [archive],
      })
    ).toEqual([{ kind: "insert", liveStream: stream, video: archive }]);
  });

  it("never brings back a placeholder that was deleted", () => {
    expect(
      planNewVideos({
        liveStreams: [],
        savedByStreamId: [
          createSavedVideo({ deleted_at: "2024-05-01T10:00:00+00:00" }),
        ],
        savedByVideoId: [],
        videos: [archive],
      })
    ).toEqual([]);
  });

  it("skips a video whose stream already belongs to another video", () => {
    const other = createSavedVideo({
      status: "ENDED",
      twitch_video: { twitch_video_id: "vod-other", type: "archive" },
    });

    expect(
      planNewVideos({
        liveStreams: [],
        savedByStreamId: [other],
        savedByVideoId: [],
        videos: [archive],
      })
    ).toEqual([]);
  });

  it("does not treat an upload as part of a live broadcast", () => {
    const upload = createVideo({
      id: "upload-1",
      stream_id: null,
      type: "upload",
    });

    expect(
      planNewVideos({
        liveStreams: [createStream()],
        savedByStreamId: [],
        savedByVideoId: [],
        videos: [upload],
      })
    ).toEqual([{ kind: "insert", liveStream: undefined, video: upload }]);
  });

  it("plans a video listed twice only once", () => {
    expect(
      planNewVideos({
        liveStreams: [],
        savedByStreamId: [],
        savedByVideoId: [],
        videos: [archive, archive],
      })
    ).toHaveLength(1);
  });
});

describe("addNewTwitchVideos", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createThumbnail).mockResolvedValue({
      id: "thumb-new",
      path: "vod-1/x.jpg",
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

  it("adds archives and uploads that are not saved yet", async () => {
    supabase.respondWith({ "GET talents": TWITCH_TALENTS });
    const upload = createVideo({
      duration: "PT5M",
      id: "upload-1",
      stream_id: null,
      title: "Upload",
      type: "upload",
    });
    const { getRecentVideos, fetcher } = createFakeTwitchFetcher({
      archives: [createVideo()],
      uploads: [upload],
    });

    const added = await addNewTwitchVideos(createContext(fetcher));

    expect(added).toBe(2);
    expect(getRecentVideos).toHaveBeenCalledWith(["twitch-user-1"], {
      type: "archive",
    });
    expect(getRecentVideos).toHaveBeenCalledWith(["twitch-user-1"], {
      type: "upload",
    });

    const videos = supabase.insertedVideos().map(({ video }) => video);
    const twitchVideos = supabase
      .insertedVideos()
      .map(({ platformVideo }) => platformVideo);

    expect(videos.find((video) => video.title === "Archive")).toMatchObject({
      duration: "PT2H",
      platform: "twitch",
      published_at: "2024-05-01T09:00:00Z",
      status: "ENDED",
      talent_id: "talent-1",
      thumbnail_id: "thumb-new",
      video_kind: "standard",
    });
    expect(videos.find((video) => video.title === "Upload")).toMatchObject({
      status: "PUBLISHED",
    });
    expect(twitchVideos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stream_id: "stream-1",
          twitch_user_id: "user-row-1",
          twitch_video_id: "vod-1",
          type: "archive",
        }),
        expect.objectContaining({
          stream_id: null,
          twitch_video_id: "upload-1",
          type: "upload",
        }),
      ])
    );
  });

  it("turns the placeholder of an ended broadcast into its archive", async () => {
    supabase.respondWith({
      "GET talents": TWITCH_TALENTS,
      "GET videos": findSavedVideos([createSavedVideo({ status: "ENDED" })]),
    });
    const { fetcher } = createFakeTwitchFetcher({ archives: [createVideo()] });

    const added = await addNewTwitchVideos(createContext(fetcher));

    expect(added).toBe(1);
    expect(supabase.insertedVideos()).toHaveLength(0);
    expect(supabase.written("PATCH", "twitch_videos")[0]).toMatchObject({
      body: { twitch_video_id: "vod-1", type: "archive" },
      query: { id: "eq.twitch-row-1" },
    });
    expect(supabase.written("PATCH", "videos")[0]).toMatchObject({
      body: {
        duration: "PT2H",
        published_at: "2024-05-01T09:00:00Z",
        status: "ENDED",
        thumbnail_id: "thumb-new",
        title: "Archive",
      },
      query: { id: "eq.video-1" },
    });
    // Cached pages may still show the preview, so the cleanup removes it later.
    expect(supabase.written("DELETE", "thumbnails")).toEqual([]);
    expect(removedImages).toEqual([]);
  });

  it("removes the new thumbnail when the placeholder cannot be updated", async () => {
    supabase.respondWith({
      "GET talents": TWITCH_TALENTS,
      "GET videos": findSavedVideos([createSavedVideo({ status: "ENDED" })]),
      "PATCH videos": () => postgresError("57014", "statement timeout"),
    });
    const { fetcher } = createFakeTwitchFetcher({ archives: [createVideo()] });

    const added = await addNewTwitchVideos(createContext(fetcher));

    expect(added).toBe(0);
    expect(
      supabase.written("DELETE", "thumbnails").map(({ query }) => query["id"])
    ).toEqual(["eq.thumb-new"]);
    expect(removedImages).toEqual([{ prefixes: ["vod-1/x.jpg"] }]);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("statement timeout"),
      }),
      { twitchVideoId: "vod-1" }
    );
  });

  it("keeps a broadcast LIVE when its archive shows up while on air", async () => {
    supabase.respondWith({
      "GET talents": TWITCH_TALENTS,
      "GET videos": findSavedVideos([createSavedVideo()]),
    });
    const { fetcher } = createFakeTwitchFetcher({
      archives: [createVideo({ duration: "PT10M", thumbnail_url: "" })],
      liveStreams: [createStream()],
    });

    const added = await addNewTwitchVideos(createContext(fetcher));

    expect(added).toBe(0);
    expect(supabase.written("PATCH", "twitch_videos")[0]?.body).toEqual({
      twitch_video_id: "vod-1",
      type: "archive",
    });
    expect(supabase.written("PATCH", "videos")).toHaveLength(0);
    expect(createThumbnail).not.toHaveBeenCalled();
  });

  it("adds a broadcast that is on air as LIVE when it has no row yet", async () => {
    supabase.respondWith({ "GET talents": TWITCH_TALENTS });
    const { fetcher } = createFakeTwitchFetcher({
      archives: [createVideo({ duration: "PT10M", thumbnail_url: "" })],
      liveStreams: [createStream()],
    });

    const added = await addNewTwitchVideos(createContext(fetcher));

    expect(added).toBe(1);
    expect(supabase.insertedVideos()[0]?.video).toMatchObject({
      duration: "P0D",
      status: "LIVE",
      title: "Live now",
    });
    expect(supabase.insertedVideos()[0]?.platformVideo).toMatchObject({
      stream_id: "stream-1",
      twitch_video_id: "vod-1",
      type: "archive",
    });
    expect(createThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({
          url: "https://cdn.test/live-1280x720.jpg",
        }),
      })
    );
  });

  it("adds a video without a thumbnail while Twitch is still processing it", async () => {
    supabase.respondWith({ "GET talents": TWITCH_TALENTS });
    const { fetcher } = createFakeTwitchFetcher({
      archives: [
        createVideo({
          thumbnail_url:
            "https://vod-secure.twitch.tv/_404/404_processing_%{width}x%{height}.png",
        }),
      ],
    });

    await addNewTwitchVideos(createContext(fetcher));

    expect(createThumbnail).not.toHaveBeenCalled();
    expect(supabase.insertedVideos()[0]?.video).toMatchObject({
      thumbnail_id: null,
    });
  });

  it("leaves saved videos alone", async () => {
    supabase.respondWith({
      "GET talents": TWITCH_TALENTS,
      "GET videos": findSavedVideos([
        createSavedVideo({
          status: "ENDED",
          twitch_video: { twitch_video_id: "vod-1", type: "archive" },
        }),
      ]),
    });
    const { fetcher } = createFakeTwitchFetcher({ archives: [createVideo()] });

    const added = await addNewTwitchVideos(createContext(fetcher));

    expect(added).toBe(0);
    expect(supabase.requests.every((request) => request.method === "GET")).toBe(
      true
    );
  });

  it("quietly skips a video another run saved first", async () => {
    supabase.respondWith({
      "GET talents": TWITCH_TALENTS,
      "POST rpc/insert_video": () => alreadySaved(),
    });
    const { fetcher } = createFakeTwitchFetcher({ archives: [createVideo()] });

    const added = await addNewTwitchVideos(createContext(fetcher));

    expect(added).toBe(0);
    expect(supabase.insertedVideos()).toHaveLength(1);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("reports accounts that could not be read and handles the rest", async () => {
    const error = new Error("helix unavailable");
    supabase.respondWith({ "GET talents": TWITCH_TALENTS });
    const { fetcher } = createFakeTwitchFetcher({
      archives: [createVideo()],
      failures: [{ accountId: "twitch-user-9", error }],
    });

    const added = await addNewTwitchVideos(createContext(fetcher));

    expect(added).toBe(1);
    expect(reportError).toHaveBeenCalledWith(error, {
      twitchUserId: "twitch-user-9",
    });
  });

  it("does not call Twitch when no account is registered", async () => {
    supabase.respond(() => []);
    const { getLiveStreams, fetcher } = createFakeTwitchFetcher();

    const added = await addNewTwitchVideos(createContext(fetcher));

    expect(added).toBe(0);
    expect(getLiveStreams).not.toHaveBeenCalled();
  });
});
