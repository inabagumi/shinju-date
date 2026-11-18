import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestContext } from "../internal/testing/context.js";
import { createFakeFetcher } from "../internal/testing/fetcher.js";
import {
  createImage,
  mockStorage,
  serveImage,
} from "../internal/testing/images.js";
import { postgresError, setupSupabase } from "../internal/testing/supabase.js";
import type { SupabaseRoutes } from "../internal/testing/supabase.js";
import { createChannel } from "../internal/testing/youtube.js";
import type { ErrorReporter } from "../types.js";
import type { YouTubeFetcher } from "./fetcher.js";
import {
  syncYouTubeChannels,
  syncYouTubeChannelsOfTalent,
} from "./sync-accounts.js";

const supabase = setupSupabase();
const reportError = vi.fn<ErrorReporter>();
const createContext = <T>(fetcher: T) =>
  createTestContext({
    fetcher,
    reportError,
    supabaseClient: supabase.supabaseClient,
  });

const savedTalents = [
  {
    id: "talent-1",
    youtube_channels: [
      {
        id: "channel-row-1",
        name: "Alice",
        profile_images: null,
        youtube_channel_id: "UCaaa",
        youtube_handle: "@alice",
      },
    ],
  },
  {
    id: "talent-2",
    youtube_channels: [
      {
        id: "channel-row-2",
        name: "Bob",
        profile_images: null,
        youtube_channel_id: "UCbbb",
        youtube_handle: null,
      },
    ],
  },
];

/**
 * A database holding `savedTalents`, in which every write succeeds.
 */
const routes = {
  "GET talents": savedTalents,
  "PATCH youtube_channels": [{ id: "channel-row" }],
} satisfies SupabaseRoutes;

describe(syncYouTubeChannels, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates only the channels whose name or handle changed", async () => {
    supabase.respondWith(routes);
    const { getAccounts, fetcher } = createFakeFetcher<YouTubeFetcher>({
      accounts: [
        createChannel("UCaaa", { customUrl: "@alice", title: "Alice" }),
        createChannel("UCbbb", { customUrl: "@bob", title: "Bob Ch." }),
      ],
    });

    const changed = await syncYouTubeChannels(createContext(fetcher));

    expect(changed).toBeGreaterThan(0);
    expect(getAccounts).toHaveBeenCalledWith(["UCaaa", "UCbbb"]);
    expect(supabase.written("PATCH", "youtube_channels")).toStrictEqual([
      expect.objectContaining({
        body: { name: "Bob Ch.", youtube_handle: "@bob" },
        query: { id: "eq.channel-row-2" },
      }),
    ]);
  });

  it("notices a handle that changed on its own", async () => {
    supabase.respondWith(routes);
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      accounts: [
        createChannel("UCaaa", { customUrl: "@alice_new", title: "Alice" }),
      ],
    });

    const changed = await syncYouTubeChannels(createContext(fetcher));

    expect(changed).toBeGreaterThan(0);
    expect(
      supabase.written("PATCH", "youtube_channels")[0]?.body
    ).toStrictEqual({
      name: "Alice",
      youtube_handle: "@alice_new",
    });
  });

  it("writes nothing when every channel is up to date", async () => {
    supabase.respondWith(routes);
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      accounts: [
        createChannel("UCaaa", { customUrl: "@alice", title: "Alice" }),
        createChannel("UCbbb", { title: "Bob" }),
      ],
    });

    const changed = await syncYouTubeChannels(createContext(fetcher));

    expect(changed).toBe(0);
    expect(
      supabase.requests.map(({ method, table }) => `${method} ${table}`)
    ).toStrictEqual(["GET talents"]);
  });

  it("reports a channel that could not be updated and handles the rest", async () => {
    supabase.respondWith({
      ...routes,
      "PATCH youtube_channels": ({ query }) =>
        query["id"] === "eq.channel-row-1"
          ? postgresError("23505", "duplicate key value")
          : routes["PATCH youtube_channels"],
    });
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      accounts: [
        createChannel("UCaaa", { customUrl: "@alice_new", title: "Alice" }),
        createChannel("UCbbb", { customUrl: "@bob", title: "Bob Ch." }),
      ],
    });

    const changed = await syncYouTubeChannels(createContext(fetcher));

    expect(changed).toBe(1);
    expect(supabase.written("PATCH", "youtube_channels")).toStrictEqual([
      expect.objectContaining({ query: { id: "eq.channel-row-1" } }),
      expect.objectContaining({
        body: { name: "Bob Ch.", youtube_handle: "@bob" },
        query: { id: "eq.channel-row-2" },
      }),
    ]);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("duplicate key value"),
      }),
      { youtubeChannelId: "UCaaa" }
    );
  });

  it("loads the saved icon of every channel", async () => {
    supabase.respondWith(routes);
    const { fetcher } = createFakeFetcher<YouTubeFetcher>();

    await syncYouTubeChannels(createContext(fetcher));

    expect(supabase.requests[0]?.query["select"]).toContain(
      "profile_images(id,path,etag,source_url)"
    );
  });

  it("includes retired talents but not deleted ones", async () => {
    supabase.respond(() => []);
    const { fetcher } = createFakeFetcher<YouTubeFetcher>();

    await syncYouTubeChannels(createContext(fetcher));

    expect(supabase.requests[0]?.query).toMatchObject({
      deleted_at: "is.null",
    });
    expect(supabase.requests[0]?.query).not.toHaveProperty("status");
  });

  it("fails when the channels cannot be loaded", async () => {
    supabase.respond(() => postgresError("42501", "permission denied"));
    const { fetcher } = createFakeFetcher<YouTubeFetcher>();

    await expect(syncYouTubeChannels(createContext(fetcher))).rejects.toThrow(
      "permission denied"
    );
  });

  describe("icons", () => {
    const ICON_URL = "https://yt3.ggpht.com/alice=s800-c-k-c0x00ffffff-no-rj";
    const thumbnails = { high: { height: 800, url: ICON_URL, width: 800 } };

    let image: Buffer;

    beforeAll(async () => {
      image = await createImage(800, 800);
    });

    it("stores the icon of a channel that has none yet", async () => {
      serveImage(supabase, ICON_URL, { body: image });
      const storage = mockStorage(supabase, "profile-images");
      supabase.respondWith(routes);
      const { fetcher } = createFakeFetcher<YouTubeFetcher>({
        accounts: [
          createChannel("UCaaa", {
            customUrl: "@alice",
            thumbnails,
            title: "Alice",
          }),
        ],
      });

      const changed = await syncYouTubeChannels(createContext(fetcher));

      const inserted = supabase.written("POST", "profile_images")[0]?.body as {
        id: string;
        source_url: string;
      };

      expect(changed).toBe(1);
      expect(storage.uploads).toHaveLength(1);
      expect(inserted.source_url).toBe(ICON_URL);
      expect(supabase.written("PATCH", "youtube_channels")).toStrictEqual([
        expect.objectContaining({
          body: { profile_image_id: inserted.id },
          query: { id: "eq.channel-row-1", select: "id" },
        }),
      ]);
      expect(reportError).not.toHaveBeenCalled();
    });

    it("leaves an icon alone when YouTube serves the same one", async () => {
      const requests = serveImage(supabase, ICON_URL, { body: image });
      const storage = mockStorage(supabase, "profile-images");
      supabase.respondWith({
        ...routes,
        "GET talents": [
          {
            id: "talent-1",
            youtube_channels: [
              {
                ...savedTalents[0]?.youtube_channels[0],
                profile_images: {
                  etag: '"etag-1"',
                  id: "image-1",
                  path: "youtube/UCaaa/icon.webp",
                  source_url: ICON_URL,
                },
              },
            ],
          },
        ],
      });
      const { fetcher } = createFakeFetcher<YouTubeFetcher>({
        accounts: [
          createChannel("UCaaa", {
            customUrl: "@alice",
            thumbnails,
            title: "Alice",
          }),
        ],
      });

      const changed = await syncYouTubeChannels(createContext(fetcher));

      expect(changed).toBe(0);
      expect(requests).toStrictEqual([
        { ifNoneMatch: '"etag-1"', url: ICON_URL },
      ]);
      expect(storage.uploads).toHaveLength(0);
      expect(supabase.written("PATCH", "youtube_channels")).toHaveLength(0);
    });

    it("still syncs the name when the icon cannot be stored", async () => {
      serveImage(supabase, ICON_URL, {
        body: Buffer.from("not found"),
        contentType: "text/plain",
      });
      mockStorage(supabase, "profile-images");
      supabase.respondWith(routes);
      const { fetcher } = createFakeFetcher<YouTubeFetcher>({
        accounts: [
          createChannel("UCbbb", {
            customUrl: "@bob",
            thumbnails,
            title: "Bob Ch.",
          }),
        ],
      });

      const changed = await syncYouTubeChannels(createContext(fetcher));

      expect(changed).toBe(1);
      expect(supabase.written("PATCH", "youtube_channels")).toStrictEqual([
        expect.objectContaining({
          body: { name: "Bob Ch.", youtube_handle: "@bob" },
        }),
      ]);
      expect(supabase.written("POST", "profile_images")).toHaveLength(0);
      expect(reportError).toHaveBeenCalledWith(expect.any(TypeError), {
        operation: "syncProfileImage",
        youtubeChannelId: "UCbbb",
      });
    });

    it("still syncs the icon when the name cannot be updated", async () => {
      serveImage(supabase, ICON_URL, { body: image });
      const storage = mockStorage(supabase, "profile-images");
      supabase.respondWith({
        ...routes,
        "PATCH youtube_channels": ({ body }) =>
          body !== null && typeof body === "object" && "name" in body
            ? postgresError("23505", "duplicate key value")
            : routes["PATCH youtube_channels"],
      });
      const { fetcher } = createFakeFetcher<YouTubeFetcher>({
        accounts: [
          createChannel("UCaaa", {
            customUrl: "@alice_new",
            thumbnails,
            title: "Alice",
          }),
        ],
      });

      const changed = await syncYouTubeChannels(createContext(fetcher));

      const inserted = supabase.written("POST", "profile_images")[0]?.body as {
        id: string;
      };

      expect(changed).toBe(1);
      expect(storage.uploads).toHaveLength(1);
      expect(supabase.written("PATCH", "youtube_channels")).toContainEqual(
        expect.objectContaining({
          body: { profile_image_id: inserted.id },
          query: { id: "eq.channel-row-1", select: "id" },
        })
      );
      expect(reportError).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          message: expect.stringContaining("duplicate key value"),
        }),
        { youtubeChannelId: "UCaaa" }
      );
    });
  });
});

describe(syncYouTubeChannelsOfTalent, () => {
  const ICON_URL = "https://yt3.ggpht.com/bob=s800-c-k-c0x00ffffff-no-rj";
  const thumbnails = { high: { height: 800, url: ICON_URL, width: 800 } };

  /** A database holding the channels of `talent-2` only. */
  const talentRoutes = {
    ...routes,
    "GET talents": [
      {
        id: "talent-2",
        youtube_channels: [
          ...(savedTalents[1]?.youtube_channels ?? []),
          {
            id: "channel-row-3",
            name: "Bob Sub",
            profile_images: null,
            youtube_channel_id: "UCccc",
            youtube_handle: "@bob_sub",
          },
        ],
      },
    ],
  } satisfies SupabaseRoutes;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs only the channels of the talent and returns what changed", async () => {
    supabase.respondWith(talentRoutes);
    const { fetcher, getAccounts } = createFakeFetcher<YouTubeFetcher>({
      accounts: [
        createChannel("UCbbb", { customUrl: "@bob", title: "Bob Ch." }),
        createChannel("UCccc", { customUrl: "@bob_sub", title: "Bob Sub" }),
      ],
    });

    const results = await syncYouTubeChannelsOfTalent(
      createContext(fetcher),
      "talent-2"
    );

    expect(supabase.requests[0]?.query).toMatchObject({
      deleted_at: "is.null",
      id: "eq.talent-2",
    });
    expect(getAccounts).toHaveBeenCalledWith(["UCbbb", "UCccc"]);
    expect(results).toStrictEqual([
      {
        accountId: "channel-row-2",
        changes: {
          after: { name: "Bob Ch.", youtube_handle: "@bob" },
          before: { name: "Bob", youtube_handle: null },
        },
        iconUpdated: false,
        name: "Bob Ch.",
        status: "updated",
      },
      {
        accountId: "channel-row-3",
        iconUpdated: false,
        name: "Bob Sub",
        status: "unchanged",
      },
    ]);
    expect(supabase.written("PATCH", "youtube_channels")).toStrictEqual([
      expect.objectContaining({
        body: { name: "Bob Ch.", youtube_handle: "@bob" },
        query: { id: "eq.channel-row-2" },
      }),
    ]);
  });

  it("keeps only the columns that changed in the changes", async () => {
    supabase.respondWith(talentRoutes);
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      accounts: [createChannel("UCbbb", { customUrl: "@bob", title: "Bob" })],
    });

    const [result] = await syncYouTubeChannelsOfTalent(
      createContext(fetcher),
      "talent-2"
    );

    expect(result?.changes).toStrictEqual({
      after: { youtube_handle: "@bob" },
      before: { youtube_handle: null },
    });
  });

  it("writes nothing when every channel is up to date", async () => {
    supabase.respondWith(talentRoutes);
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      accounts: [
        createChannel("UCbbb", { title: "Bob" }),
        createChannel("UCccc", { customUrl: "@bob_sub", title: "Bob Sub" }),
      ],
    });

    const results = await syncYouTubeChannelsOfTalent(
      createContext(fetcher),
      "talent-2"
    );

    expect(results.map(({ status }) => status)).toStrictEqual([
      "unchanged",
      "unchanged",
    ]);
    // Unused icons are left to the scheduled sync
    expect(
      supabase.requests.map(({ method, table }) => `${method} ${table}`)
    ).toStrictEqual(["GET talents"]);
  });

  it("reports a channel YouTube does not return as not found", async () => {
    supabase.respondWith(talentRoutes);
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      accounts: [
        createChannel("UCccc", { customUrl: "@bob_sub", title: "Bob Sub" }),
      ],
    });

    const results = await syncYouTubeChannelsOfTalent(
      createContext(fetcher),
      "talent-2"
    );

    expect(results[0]).toStrictEqual({
      accountId: "channel-row-2",
      iconUpdated: false,
      name: "Bob",
      status: "not-found",
    });
  });

  it("reports a channel that cannot be updated as failed and syncs the rest", async () => {
    supabase.respondWith({
      ...talentRoutes,
      "PATCH youtube_channels": ({ query }) =>
        query["id"] === "eq.channel-row-2"
          ? postgresError("23505", "duplicate key value")
          : talentRoutes["PATCH youtube_channels"],
    });
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      accounts: [
        createChannel("UCbbb", { customUrl: "@bob", title: "Bob Ch." }),
        createChannel("UCccc", { customUrl: "@bob_sub", title: "Bob Sub!" }),
      ],
    });

    const results = await syncYouTubeChannelsOfTalent(
      createContext(fetcher),
      "talent-2"
    );

    expect(results.map(({ name, status }) => ({ name, status }))).toStrictEqual(
      [
        { name: "Bob", status: "failed" },
        { name: "Bob Sub!", status: "updated" },
      ]
    );
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("duplicate key value"),
      }),
      { youtubeChannelId: "UCbbb" }
    );
  });

  it("reports an icon that changed although the name did not", async () => {
    serveImage(supabase, ICON_URL, { body: await createImage(800, 800) });
    mockStorage(supabase, "profile-images");
    supabase.respondWith(talentRoutes);
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      accounts: [createChannel("UCbbb", { thumbnails, title: "Bob" })],
    });

    const [result] = await syncYouTubeChannelsOfTalent(
      createContext(fetcher),
      "talent-2"
    );

    expect(result).toStrictEqual({
      accountId: "channel-row-2",
      iconUpdated: true,
      name: "Bob",
      status: "updated",
    });
    expect(supabase.written("POST", "profile_images")).toHaveLength(1);
  });

  it("still syncs the icon of a channel whose name cannot be updated", async () => {
    serveImage(supabase, ICON_URL, { body: await createImage(800, 800) });
    const storage = mockStorage(supabase, "profile-images");
    supabase.respondWith({
      ...talentRoutes,
      "PATCH youtube_channels": ({ body }) =>
        body !== null && typeof body === "object" && "name" in body
          ? postgresError("23505", "duplicate key value")
          : talentRoutes["PATCH youtube_channels"],
    });
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      accounts: [
        createChannel("UCbbb", { customUrl: "@bob", thumbnails, title: "Bob" }),
      ],
    });

    const [result] = await syncYouTubeChannelsOfTalent(
      createContext(fetcher),
      "talent-2"
    );

    expect(result).toStrictEqual({
      accountId: "channel-row-2",
      iconUpdated: true,
      name: "Bob",
      status: "failed",
    });
    expect(storage.uploads).toHaveLength(1);
  });

  it("returns nothing without asking YouTube when the talent has no channels", async () => {
    supabase.respond(() => []);
    const { fetcher, getAccounts } = createFakeFetcher<YouTubeFetcher>();

    await expect(
      syncYouTubeChannelsOfTalent(createContext(fetcher), "talent-9")
    ).resolves.toStrictEqual([]);
    expect(getAccounts).not.toHaveBeenCalled();
  });

  it("fails when the channels cannot be loaded", async () => {
    supabase.respond(() => postgresError("42501", "permission denied"));
    const { fetcher } = createFakeFetcher<YouTubeFetcher>();

    await expect(
      syncYouTubeChannelsOfTalent(createContext(fetcher), "talent-2")
    ).rejects.toThrow("permission denied");
  });

  it("fails when YouTube cannot be read", async () => {
    supabase.respondWith(talentRoutes);
    const { fetcher, getAccounts } = createFakeFetcher<YouTubeFetcher>();
    getAccounts.mockRejectedValue(new Error("quota exceeded"));

    await expect(
      syncYouTubeChannelsOfTalent(createContext(fetcher), "talent-2")
    ).rejects.toThrow("quota exceeded");
    expect(supabase.written("PATCH", "youtube_channels")).toHaveLength(0);
  });
});
