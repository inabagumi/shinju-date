import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestContext } from "../internal/testing/context.js";
import { createFakeTwitchFetcher } from "../internal/testing/fetcher.js";
import {
  createImage,
  mockStorage,
  serveImage,
} from "../internal/testing/images.js";
import { postgresError, setupSupabase } from "../internal/testing/supabase.js";
import type {
  SupabaseResponder,
  SupabaseRoutes,
} from "../internal/testing/supabase.js";
import { createUser } from "../internal/testing/twitch.js";
import type { ErrorReporter } from "../types.js";
import { syncTwitchUsers, syncTwitchUsersOfTalent } from "./sync-accounts.js";

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
    twitch_users: [
      {
        id: "user-row-1",
        name: "Alice",
        profile_images: null,
        twitch_login_name: "alice",
        twitch_user_id: "1001",
      },
      {
        id: "user-row-2",
        name: "Alice Sub",
        profile_images: null,
        twitch_login_name: "alice_sub",
        twitch_user_id: "1002",
      },
    ],
  },
];

/**
 * A database holding `savedTalents`, in which every write succeeds.
 */
const routes = {
  "GET talents": savedTalents,
  "PATCH twitch_users": [{ id: "user-row" }],
} satisfies SupabaseRoutes;

describe(syncTwitchUsers, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates only the accounts whose name or login changed", async () => {
    supabase.respondWith(routes);
    const { getAccounts, fetcher } = createFakeTwitchFetcher({
      accounts: [
        createUser("1001"),
        createUser("1002", { display_name: "Alice 2nd", login: "alice_2nd" }),
      ],
    });

    const changed = await syncTwitchUsers(createContext(fetcher));

    expect(changed).toBeGreaterThan(0);
    expect(getAccounts).toHaveBeenCalledWith(["1001", "1002"]);
    expect(supabase.written("PATCH", "twitch_users")).toStrictEqual([
      expect.objectContaining({
        body: { name: "Alice 2nd", twitch_login_name: "alice_2nd" },
        query: { id: "eq.user-row-2" },
      }),
    ]);
  });

  it("writes nothing when every account is up to date", async () => {
    supabase.respondWith(routes);
    const { fetcher } = createFakeTwitchFetcher({
      accounts: [
        createUser("1001"),
        createUser("1002", { display_name: "Alice Sub", login: "alice_sub" }),
      ],
    });

    const changed = await syncTwitchUsers(createContext(fetcher));

    expect(changed).toBe(0);
    expect(supabase.requests).toHaveLength(1);
  });

  it("reports an account that could not be updated and handles the rest", async () => {
    supabase.respond(({ method, query }) => {
      if (method === "GET") {
        return savedTalents;
      }

      return query["id"] === "eq.user-row-1"
        ? postgresError("23505", "duplicate key value")
        : [];
    });
    const { fetcher } = createFakeTwitchFetcher({
      accounts: [
        createUser("1001", { login: "alice_new" }),
        createUser("1002", { display_name: "Alice Sub!", login: "alice_sub" }),
      ],
    });

    const changed = await syncTwitchUsers(createContext(fetcher));

    expect(changed).toBeGreaterThan(0);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("duplicate key value"),
      }),
      { twitchUserId: "1001" }
    );
  });

  it("loads the saved icon of every account", async () => {
    supabase.respondWith(routes);
    const { fetcher } = createFakeTwitchFetcher();

    await syncTwitchUsers(createContext(fetcher));

    expect(supabase.requests[0]?.query["select"]).toContain(
      "profile_images(id,path,etag,source_url)"
    );
  });

  describe("icons", () => {
    const ICON_URL =
      "https://static-cdn.jtvnw.net/jtv_user_pictures/alice-profile_image-300x300.png";

    let image: Buffer;

    beforeAll(async () => {
      image = await createImage(300, 300);
    });

    it("stores the icon of an account that has none yet", async () => {
      serveImage(supabase, ICON_URL, { body: image, contentType: "image/png" });
      const storage = mockStorage(supabase, "profile-images");
      supabase.respondWith(routes);
      const { fetcher } = createFakeTwitchFetcher({
        accounts: [createUser("1001", { profile_image_url: ICON_URL })],
      });

      const changed = await syncTwitchUsers(createContext(fetcher));

      const inserted = supabase.written("POST", "profile_images")[0]?.body as {
        id: string;
        source_url: string;
      };

      expect(changed).toBe(1);
      expect(storage.uploads).toStrictEqual([
        expect.objectContaining({
          path: expect.stringMatching(/^twitch\/1001\//),
        }),
      ]);
      expect(inserted.source_url).toBe(ICON_URL);
      expect(supabase.written("PATCH", "twitch_users")).toStrictEqual([
        expect.objectContaining({
          body: { profile_image_id: inserted.id },
          query: { id: "eq.user-row-1", select: "id" },
        }),
      ]);
      expect(reportError).not.toHaveBeenCalled();
    });

    it("leaves an icon alone when Twitch serves the same one", async () => {
      const requests = serveImage(supabase, ICON_URL, { body: image });
      const storage = mockStorage(supabase, "profile-images");
      supabase.respondWith({
        ...routes,
        "GET talents": [
          {
            id: "talent-1",
            twitch_users: [
              {
                ...savedTalents[0]?.twitch_users[0],
                profile_images: {
                  etag: '"etag-1"',
                  id: "image-1",
                  path: "twitch/1001/icon.webp",
                  source_url: ICON_URL,
                },
              },
            ],
          },
        ],
      });
      const { fetcher } = createFakeTwitchFetcher({
        accounts: [createUser("1001", { profile_image_url: ICON_URL })],
      });

      const changed = await syncTwitchUsers(createContext(fetcher));

      expect(changed).toBe(0);
      expect(requests).toStrictEqual([
        { ifNoneMatch: '"etag-1"', url: ICON_URL },
      ]);
      expect(storage.uploads).toHaveLength(0);
      expect(supabase.written("PATCH", "twitch_users")).toHaveLength(0);
    });

    it("still syncs the name when the icon cannot be stored", async () => {
      serveImage(supabase, ICON_URL, {
        body: Buffer.from("not found"),
        contentType: "text/plain",
      });
      mockStorage(supabase, "profile-images");
      supabase.respondWith(routes);
      const { fetcher } = createFakeTwitchFetcher({
        accounts: [
          createUser("1002", {
            display_name: "Alice 2nd",
            login: "alice_2nd",
            profile_image_url: ICON_URL,
          }),
        ],
      });

      const changed = await syncTwitchUsers(createContext(fetcher));

      expect(changed).toBe(1);
      expect(supabase.written("PATCH", "twitch_users")).toStrictEqual([
        expect.objectContaining({
          body: { name: "Alice 2nd", twitch_login_name: "alice_2nd" },
        }),
      ]);
      expect(supabase.written("POST", "profile_images")).toHaveLength(0);
      expect(reportError).toHaveBeenCalledWith(expect.any(TypeError), {
        operation: "syncProfileImage",
        twitchUserId: "1002",
      });
    });

    it("still syncs the icon when the name cannot be updated", async () => {
      serveImage(supabase, ICON_URL, { body: image, contentType: "image/png" });
      const storage = mockStorage(supabase, "profile-images");
      supabase.respondWith({
        ...routes,
        "PATCH twitch_users": ({ body }) =>
          body !== null && typeof body === "object" && "name" in body
            ? postgresError("23505", "duplicate key value")
            : routes["PATCH twitch_users"],
      });
      const { fetcher } = createFakeTwitchFetcher({
        accounts: [
          createUser("1001", {
            login: "alice_new",
            profile_image_url: ICON_URL,
          }),
        ],
      });

      const changed = await syncTwitchUsers(createContext(fetcher));

      expect(changed).toBe(1);
      expect(storage.uploads).toHaveLength(1);
      expect(reportError).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          message: expect.stringContaining("duplicate key value"),
        }),
        { twitchUserId: "1001" }
      );
    });

    it("writes nothing for an account with a default icon", async () => {
      const storage = mockStorage(supabase, "profile-images");
      supabase.respondWith(routes);
      const { fetcher } = createFakeTwitchFetcher({
        accounts: [
          createUser("1001", {
            profile_image_url:
              "https://static-cdn.jtvnw.net/user-default-pictures-uv/default-profile_image-300x300.png",
          }),
        ],
      });

      const changed = await syncTwitchUsers(createContext(fetcher));

      expect(changed).toBe(0);
      expect(storage.uploads).toHaveLength(0);
      expect(supabase.requests).toHaveLength(1);
    });
  });
});

describe(syncTwitchUsersOfTalent, () => {
  const ICON_URL =
    "https://static-cdn.jtvnw.net/jtv_user_pictures/alice-profile_image-300x300.png";

  /** Fails to write the display name and login of `user-row-1`. */
  const failDetailsOfFirstUser: SupabaseResponder = ({ body, query }) =>
    query["id"] === "eq.user-row-1" &&
    body !== null &&
    typeof body === "object" &&
    "name" in body
      ? postgresError("23505", "duplicate key value")
      : routes["PATCH twitch_users"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs only the accounts of the talent and returns what changed", async () => {
    supabase.respondWith(routes);
    const { fetcher, getAccounts } = createFakeTwitchFetcher({
      accounts: [
        createUser("1001"),
        createUser("1002", { display_name: "Alice Sub", login: "alice_2nd" }),
      ],
    });

    const results = await syncTwitchUsersOfTalent(
      createContext(fetcher),
      "talent-1"
    );

    expect(supabase.requests[0]?.query).toMatchObject({
      deleted_at: "is.null",
      id: "eq.talent-1",
    });
    expect(getAccounts).toHaveBeenCalledWith(["1001", "1002"]);
    expect(results).toStrictEqual([
      {
        accountId: "user-row-1",
        iconUpdated: false,
        name: "Alice",
        status: "unchanged",
      },
      {
        accountId: "user-row-2",
        changes: {
          after: { twitch_login_name: "alice_2nd" },
          before: { twitch_login_name: "alice_sub" },
        },
        iconUpdated: false,
        name: "Alice Sub",
        status: "updated",
      },
    ]);
    expect(supabase.written("PATCH", "twitch_users")).toStrictEqual([
      expect.objectContaining({
        body: { name: "Alice Sub", twitch_login_name: "alice_2nd" },
        query: { id: "eq.user-row-2" },
      }),
    ]);
  });

  it("writes nothing when every account is up to date", async () => {
    supabase.respondWith(routes);
    const { fetcher } = createFakeTwitchFetcher({
      accounts: [
        createUser("1001"),
        createUser("1002", { display_name: "Alice Sub", login: "alice_sub" }),
      ],
    });

    const results = await syncTwitchUsersOfTalent(
      createContext(fetcher),
      "talent-1"
    );

    expect(results.map(({ status }) => status)).toStrictEqual([
      "unchanged",
      "unchanged",
    ]);
    expect(supabase.requests).toHaveLength(1);
  });

  it("reports an account Twitch does not return as not found", async () => {
    supabase.respondWith(routes);
    const { fetcher } = createFakeTwitchFetcher({
      accounts: [
        createUser("1002", { display_name: "Alice Sub", login: "alice_sub" }),
      ],
    });

    const results = await syncTwitchUsersOfTalent(
      createContext(fetcher),
      "talent-1"
    );

    expect(results[0]).toStrictEqual({
      accountId: "user-row-1",
      iconUpdated: false,
      name: "Alice",
      status: "not-found",
    });
  });

  it("reports an account that cannot be updated as failed and syncs the rest", async () => {
    supabase.respondWith({
      ...routes,
      "PATCH twitch_users": failDetailsOfFirstUser,
    });
    const { fetcher } = createFakeTwitchFetcher({
      accounts: [
        createUser("1001", { login: "alice_new" }),
        createUser("1002", { display_name: "Alice Sub!", login: "alice_sub" }),
      ],
    });

    const results = await syncTwitchUsersOfTalent(
      createContext(fetcher),
      "talent-1"
    );

    expect(results.map(({ name, status }) => ({ name, status }))).toStrictEqual(
      [
        { name: "Alice", status: "failed" },
        { name: "Alice Sub!", status: "updated" },
      ]
    );
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("duplicate key value"),
      }),
      { twitchUserId: "1001" }
    );
  });

  it("still syncs the icon of an account whose name cannot be updated", async () => {
    serveImage(supabase, ICON_URL, {
      body: await createImage(300, 300),
      contentType: "image/png",
    });
    mockStorage(supabase, "profile-images");
    supabase.respondWith({
      ...routes,
      "PATCH twitch_users": failDetailsOfFirstUser,
    });
    const { fetcher } = createFakeTwitchFetcher({
      accounts: [
        createUser("1001", { login: "alice_new", profile_image_url: ICON_URL }),
      ],
    });

    const [result] = await syncTwitchUsersOfTalent(
      createContext(fetcher),
      "talent-1"
    );

    expect(result).toStrictEqual({
      accountId: "user-row-1",
      iconUpdated: true,
      name: "Alice",
      status: "failed",
    });
  });

  it("returns nothing without asking Twitch when the talent has no accounts", async () => {
    supabase.respond(() => []);
    const { fetcher, getAccounts } = createFakeTwitchFetcher();

    await expect(
      syncTwitchUsersOfTalent(createContext(fetcher), "talent-9")
    ).resolves.toStrictEqual([]);
    expect(getAccounts).not.toHaveBeenCalled();
  });

  it("fails when the accounts cannot be loaded", async () => {
    supabase.respond(() => postgresError("42501", "permission denied"));
    const { fetcher } = createFakeTwitchFetcher();

    await expect(
      syncTwitchUsersOfTalent(createContext(fetcher), "talent-1")
    ).rejects.toThrow("permission denied");
  });

  it("fails when Twitch cannot be read", async () => {
    supabase.respondWith(routes);
    const { fetcher, getAccounts } = createFakeTwitchFetcher();
    getAccounts.mockRejectedValue(new Error("Helix is down"));

    await expect(
      syncTwitchUsersOfTalent(createContext(fetcher), "talent-1")
    ).rejects.toThrow("Helix is down");
    expect(supabase.written("PATCH", "twitch_users")).toHaveLength(0);
  });
});
