import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { seedCollections } from "./collections.js";
import { MOCK_DELETED_TALENT_ID } from "./seeds/accounts.js";
import { server } from "./server.js";

describe("Supabase Handlers", () => {
  beforeAll(() => {
    server.listen();
  });
  afterEach(() => {
    server.resetHandlers();
    delete process.env["MSW_SUPABASE_AUTHENTICATED"];
  });

  afterAll(() => {
    server.close();
  });

  describe("Authentication", () => {
    describe("/auth/v1/user", () => {
      it("should return 401 if not authenticated", async () => {
        const response = await fetch("https://fake.supabase.test/auth/v1/user");
        expect(response.status).toBe(401);
      });

      it("should return user data if authenticated via cookie", async () => {
        const response = await fetch(
          "https://fake.supabase.test/auth/v1/user",
          {
            headers: {
              cookie: "sb-access-token=mock_access_token",
            },
          }
        );
        const json = (await response.json()) as { email: string; id: string };
        expect(response.status).toBe(200);
        expect(json.id).toBe("mock-user-id");
        expect(json.email).toBe("admin@example.com");
      });

      it("should return user data if MSW_SUPABASE_AUTHENTICATED is true", async () => {
        process.env["MSW_SUPABASE_AUTHENTICATED"] = "true";
        const response = await fetch("https://fake.supabase.test/auth/v1/user");
        const json = (await response.json()) as { id: string };
        expect(response.status).toBe(200);
        expect(json.id).toBe("mock-user-id");
      });
    });

    describe("/auth/v1/token", () => {
      it("should return tokens and set cookies for valid credentials", async () => {
        const response = await fetch(
          "https://fake.supabase.test/auth/v1/token?grant_type=password",
          {
            body: JSON.stringify({
              email: "admin@example.com",
              password: "password123",
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }
        );
        const json = (await response.json()) as { access_token: string };
        expect(response.status).toBe(200);
        expect(json.access_token).toBe("mock_access_token");
        expect(response.headers.get("set-cookie")).toContain(
          "sb-access-token=mock_access_token"
        );
        expect(response.headers.get("set-cookie")).toContain(
          "sb-refresh-token=mock_refresh_token"
        );
      });

      it("should return 400 for invalid credentials", async () => {
        const response = await fetch(
          "https://fake.supabase.test/auth/v1/token?grant_type=password",
          {
            body: JSON.stringify({
              email: "wrong@example.com",
              password: "wrongpassword",
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }
        );
        expect(response.status).toBe(400);
      });
    });

    describe("/auth/v1/logout", () => {
      it("should return 204 and clear cookies", async () => {
        const response = await fetch(
          "https://fake.supabase.test/auth/v1/logout",
          {
            method: "POST",
          }
        );
        expect(response.status).toBe(204);
        const cookies = response.headers.get("set-cookie");
        expect(cookies).toContain("sb-access-token=;");
        expect(cookies).toContain("sb-refresh-token=;");
      });
    });
  });

  describe("Videos endpoint", () => {
    it("should return mock videos data", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/videos?select=id,title&limit=2"
      );
      const data = (await response.json()) as unknown[];

      expect(response.ok).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
      expect(data[0]).toHaveProperty("id");
      expect(data[0]).toHaveProperty("title");
    });

    it("should handle select with relations", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/videos?select=id,title,thumbnails(path,blur_data_url)"
      );
      const data = (await response.json()) as {
        thumbnail_id?: string | null;
      }[];

      expect(response.ok).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      // The relation handling should return thumbnails for videos that have them
      if (data[0]?.thumbnail_id) {
        expect(data[0]).toHaveProperty("thumbnails");
      } else {
        // Just verify the basic structure is there
        expect(data[0]).toHaveProperty("id");
        expect(data[0]).toHaveProperty("title");
      }
    });

    it("should resolve aliased relations used by the admin video list", async () => {
      const select = [
        "id",
        "title",
        "thumbnail:thumbnails(id,path,blur_data_url)",
        "talent:talents(id,name)",
        "youtube_video:youtube_videos(youtube_video_id)",
        "twitch_video:twitch_videos(twitch_video_id,type,twitch_user:twitch_users(twitch_login_name))",
      ].join(",");
      const response = await fetch(
        `https://fake.supabase.test/rest/v1/videos?select=${encodeURIComponent(select)}`
      );
      const data = (await response.json()) as {
        talent: unknown;
        thumbnail: Record<string, unknown> | null;
        twitch_video: unknown;
        youtube_video: unknown;
      }[];

      expect(response.ok).toBe(true);
      expect(data.some((video) => video.youtube_video)).toBe(true);
      expect(data.some((video) => video.twitch_video)).toBe(true);
      for (const video of data) {
        expect(Object.keys(video).sort()).toEqual(
          [
            "id",
            "talent",
            "thumbnail",
            "title",
            "twitch_video",
            "youtube_video",
          ].sort()
        );
        expect(video.talent).toEqual({
          id: expect.any(String),
          name: expect.any(String),
        });
        if (video.thumbnail) {
          expect(Object.keys(video.thumbnail).sort()).toEqual(
            ["blur_data_url", "id", "path"].sort()
          );
        }
        if (video.youtube_video) {
          expect(video.youtube_video).toEqual({
            youtube_video_id: expect.any(String),
          });
          expect(video.twitch_video).toBeNull();
        } else {
          expect(video.twitch_video).toEqual({
            twitch_user: { twitch_login_name: expect.any(String) },
            twitch_video_id: expect.any(String),
            type: expect.toBeOneOf([
              "archive",
              "highlight",
              "upload",
              "clip",
              null,
            ]),
          });
        }
      }
    });

    it("should resolve nested relations recursively", async () => {
      const select = "id,video:videos(id,title,thumbnail:thumbnails(id,path))";
      const response = await fetch(
        `https://fake.supabase.test/rest/v1/youtube_videos?select=${encodeURIComponent(select)}&limit=1`
      );
      const data = (await response.json()) as { video: unknown }[];

      expect(response.ok).toBe(true);
      expect(data[0]?.video).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
        })
      );
      expect(data[0]?.video).toHaveProperty("thumbnail");
    });

    it("should apply offset before limit", async () => {
      const allResponse = await fetch(
        "https://fake.supabase.test/rest/v1/videos?select=id"
      );
      const all = (await allResponse.json()) as { id: string }[];
      expect(all.length).toBeGreaterThan(2);

      const response = await fetch(
        "https://fake.supabase.test/rest/v1/videos?select=id&offset=1&limit=2"
      );
      const data = await response.json();

      expect(data).toEqual(all.slice(1, 3));
    });

    it("should handle filtering with id=in", async () => {
      const ids = (
        (await (
          await fetch("https://fake.supabase.test/rest/v1/videos?select=id")
        ).json()) as { id: string }[]
      )
        .slice(0, 2)
        .map((video) => video.id);
      expect(ids).toHaveLength(2);

      const response = await fetch(
        `https://fake.supabase.test/rest/v1/videos?select=*&id=in.(${ids.join(",")})`
      );
      const data = (await response.json()) as { id: string }[];

      expect(response.ok).toBe(true);
      expect(data.map((video) => video.id).sort()).toEqual([...ids].sort());
    });

    it("should apply both ends of a range on the same column, sorted", async () => {
      const all = (await (
        await fetch(
          "https://fake.supabase.test/rest/v1/videos?select=id,published_at&order=published_at.asc,id.asc"
        )
      ).json()) as { id: string; published_at: string }[];
      const instants = all.map((video) =>
        Temporal.Instant.from(video.published_at)
      );

      for (const [index, instant] of instants.slice(1).entries()) {
        expect(
          Temporal.Instant.compare(instants[index] as Temporal.Instant, instant)
        ).toBeLessThanOrEqual(0);
      }

      const since = Temporal.Now.instant().subtract({ hours: 24 * 3 });
      const until = Temporal.Now.instant();
      const params = new URLSearchParams([
        ["select", "id,published_at"],
        ["published_at", `gte.${since.toString()}`],
        ["published_at", `lt.${until.toString()}`],
        ["order", "published_at.desc"],
      ]);
      const data = (await (
        await fetch(`https://fake.supabase.test/rest/v1/videos?${params}`)
      ).json()) as { id: string; published_at: string }[];

      const expected = all
        .filter((video) => {
          const instant = Temporal.Instant.from(video.published_at);

          return (
            Temporal.Instant.compare(instant, since) >= 0 &&
            Temporal.Instant.compare(instant, until) < 0
          );
        })
        .map((video) => video.id);

      expect(expected.length).toBeGreaterThan(0);
      expect(expected.length).toBeLessThan(all.length);
      expect(data.map((video) => video.id).sort()).toEqual(
        [...expected].sort()
      );
      expect(data.map((video) => video.published_at)).toEqual(
        data
          .map((video) => video.published_at)
          .toSorted((a, b) =>
            Temporal.Instant.compare(
              Temporal.Instant.from(b),
              Temporal.Instant.from(a)
            )
          )
      );
    });

    it("should exclude rows with neq", async () => {
      const data = (await (
        await fetch(
          "https://fake.supabase.test/rest/v1/videos?select=id,video_kind&video_kind=neq.short"
        )
      ).json()) as { id: string; video_kind: string }[];

      expect(data.length).toBeGreaterThan(0);
      expect(data.every((video) => video.video_kind !== "short")).toBe(true);
    });

    it("should seed at least one hidden video", async () => {
      const data = (await (
        await fetch(
          "https://fake.supabase.test/rest/v1/videos?select=id&visible=eq.false"
        )
      ).json()) as { id: string }[];

      expect(data.length).toBeGreaterThan(0);
    });

    it("should update only the rows that match all the filters", async () => {
      const url = "https://fake.supabase.test/rest/v1/videos";
      const listVideos = async (filters: string) =>
        (await (await fetch(`${url}?select=id,visible${filters}`)).json()) as {
          id: string;
          visible: boolean;
        }[];
      const setVisible = (ids: string[], visible: boolean) =>
        fetch(`${url}?id=in.(${ids.join(",")})`, {
          body: JSON.stringify({ visible }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
      // Hide one of the visible videos here, so the test does not depend on
      // which videos the seed hides.
      const [hiddenVideo, ...visibleVideos] =
        await listVideos("&visible=eq.true");
      const targets = visibleVideos.slice(0, 2);
      const untouched = visibleVideos.slice(2);

      expect(hiddenVideo).toBeDefined();
      expect(targets).toHaveLength(2);
      expect(untouched.length).toBeGreaterThan(0);

      try {
        await setVisible([hiddenVideo?.id ?? ""], false);

        const ids = [...targets, hiddenVideo].map((video) => video?.id);
        const response = await fetch(
          `${url}?id=in.(${ids.join(",")})&visible=eq.true&select=id`,
          {
            body: JSON.stringify({ visible: false }),
            headers: {
              "Content-Type": "application/json",
              prefer: "return=representation",
            },
            method: "PATCH",
          }
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual(
          targets.map(({ id }) => ({ id }))
        );

        const after = await listVideos("");
        const visibleById = new Map(
          after.map((video) => [video.id, video.visible])
        );

        for (const { id } of targets) {
          expect(visibleById.get(id)).toBe(false);
        }
        for (const { id } of untouched) {
          expect(visibleById.get(id)).toBe(true);
        }
        expect(visibleById.get(hiddenVideo?.id ?? "")).toBe(false);
      } finally {
        await setVisible(
          [hiddenVideo, ...targets].map((video) => video?.id ?? ""),
          true
        );
      }
    });
  });

  describe("Table handlers", () => {
    const restUrl = "https://fake.supabase.test/rest/v1";

    async function listIds(table: string, filters = ""): Promise<string[]> {
      const rows = (await (
        await fetch(`${restUrl}/${table}?select=id${filters}`)
      ).json()) as { id: string }[];

      return rows.map(({ id }) => id);
    }

    it.each(["videos", "talents", "terms"])(
      "should count every row of %s, not only the page",
      async (table) => {
        const total = (await listIds(table)).length;

        expect(total).toBeGreaterThan(3);

        const response = await fetch(
          `${restUrl}/${table}?select=id&offset=0&limit=3`,
          { headers: { prefer: "count=exact" } }
        );

        await expect(response.json()).resolves.toHaveLength(3);
        expect(response.headers.get("content-range")).toBe(`0-2/${total}`);

        const head = await fetch(
          `${restUrl}/${table}?select=id&offset=1&limit=2`,
          { headers: { prefer: "count=exact" }, method: "HEAD" }
        );

        expect(head.headers.get("content-range")).toBe(`1-2/${total}`);
      }
    );

    it("should count the matching rows of a page with a filter", async () => {
      const visible = await listIds("videos", "&visible=eq.true");
      const response = await fetch(
        `${restUrl}/videos?select=id&visible=eq.true&offset=2&limit=5`,
        { headers: { prefer: "count=exact" } }
      );

      await expect(response.json()).resolves.toEqual(
        visible.slice(2, 7).map((id) => ({ id }))
      );
      expect(response.headers.get("content-range")).toBe(
        `2-6/${visible.length}`
      );
    });

    it("should return an empty range when no row matches", async () => {
      const response = await fetch(
        `${restUrl}/videos?select=id&id=eq.00000000-0000-0000-0000-000000000000`,
        { headers: { prefer: "count=exact" } }
      );

      await expect(response.json()).resolves.toEqual([]);
      expect(response.headers.get("content-range")).toBe("*/0");
    });

    it("should update nothing when no row matches all the filters", async () => {
      const [video] = (await (
        await fetch(`${restUrl}/videos?select=id,title,visible&limit=1`)
      ).json()) as { id: string; title: string; visible: boolean }[];

      expect(video).toBeDefined();

      const before = (await (
        await fetch(`${restUrl}/videos?select=id,title`)
      ).json()) as { id: string; title: string }[];
      const response = await fetch(
        `${restUrl}/videos?id=eq.${video?.id}&visible=eq.${!video?.visible}&select=id`,
        {
          body: JSON.stringify({ title: "Updated title" }),
          headers: {
            "Content-Type": "application/json",
            prefer: "return=representation",
          },
          method: "PATCH",
        }
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([]);
      await expect(
        (await fetch(`${restUrl}/videos?select=id,title`)).json()
      ).resolves.toEqual(before);
    });

    it("should update every row of an in filter", async () => {
      const [first, second, third] = (await (
        await fetch(`${restUrl}/talents?select=id,theme_color&limit=3`)
      ).json()) as { id: string; theme_color: string | null }[];

      expect(third).toBeDefined();

      const targets = [first, second].map((talent) => talent?.id);

      try {
        const response = await fetch(
          `${restUrl}/talents?id=in.(${targets.join(",")})&select=id,theme_color`,
          {
            body: JSON.stringify({ theme_color: "#000000" }),
            headers: {
              "Content-Type": "application/json",
              prefer: "return=representation",
            },
            method: "PATCH",
          }
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual(
          targets.map((id) => ({ id, theme_color: "#000000" }))
        );

        const after = (await (
          await fetch(
            `${restUrl}/talents?select=id,theme_color&id=in.(${[...targets, third?.id].join(",")})`
          )
        ).json()) as { id: string; theme_color: string | null }[];

        expect(after).toEqual([
          { id: first?.id, theme_color: "#000000" },
          { id: second?.id, theme_color: "#000000" },
          { id: third?.id, theme_color: third?.theme_color },
        ]);
      } finally {
        for (const talent of [first, second]) {
          await fetch(`${restUrl}/talents?id=eq.${talent?.id}`, {
            body: JSON.stringify({ theme_color: talent?.theme_color }),
            headers: { "Content-Type": "application/json" },
            method: "PATCH",
          });
        }
      }
    });

    it("should set updated_at when a trigger of the table does", async () => {
      const [term] = (await (
        await fetch(`${restUrl}/terms?select=id,synonyms,updated_at&limit=1`)
      ).json()) as { id: string; synonyms: string[]; updated_at: string }[];

      expect(term).toBeDefined();

      const response = await fetch(
        `${restUrl}/terms?id=eq.${term?.id}&select=updated_at`,
        {
          body: JSON.stringify({ synonyms: term?.synonyms }),
          headers: {
            "Content-Type": "application/json",
            prefer: "return=representation",
          },
          method: "PATCH",
        }
      );
      const [updated] = (await response.json()) as { updated_at: string }[];

      expect(updated?.updated_at).not.toBe(term?.updated_at);
      expect(updated?.updated_at).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
      );
    });

    it("should delete only the rows that match all the filters", async () => {
      const created = await fetch(`${restUrl}/terms?select=id,term`, {
        body: JSON.stringify([
          { readings: [], synonyms: [], term: "削除するテスト用の用語1" },
          { readings: [], synonyms: [], term: "削除するテスト用の用語2" },
        ]),
        headers: {
          "Content-Type": "application/json",
          prefer: "return=representation",
        },
        method: "POST",
      });
      const [first, second] = (await created.json()) as {
        id: string;
        term: string;
      }[];

      expect(created.status).toBe(201);
      expect(second).toBeDefined();

      const before = await listIds("terms");
      const unmatched = await fetch(
        `${restUrl}/terms?id=eq.${first?.id}&term=eq.${encodeURIComponent(second?.term ?? "")}`,
        { method: "DELETE" }
      );

      expect(unmatched.status).toBe(204);
      await expect(listIds("terms")).resolves.toEqual(before);

      const deleted = await fetch(
        `${restUrl}/terms?id=in.(${first?.id},${second?.id})&select=term`,
        { headers: { prefer: "return=representation" }, method: "DELETE" }
      );

      expect(deleted.status).toBe(200);
      await expect(deleted.json()).resolves.toEqual([
        { term: first?.term },
        { term: second?.term },
      ]);
      await expect(listIds("terms")).resolves.toEqual(
        before.filter((id) => id !== first?.id && id !== second?.id)
      );
    });

    it("should merge or ignore duplicates in an upsert", async () => {
      const [user] = (await (
        await fetch(`${restUrl}/twitch_users?select=*&limit=1`)
      ).json()) as {
        id: string;
        name: string | null;
        talent_id: string;
        twitch_user_id: string;
      }[];

      expect(user).toBeDefined();

      try {
        const ignored = await fetch(`${restUrl}/twitch_users?select=id`, {
          body: JSON.stringify({ ...user, name: "Ignored" }),
          headers: {
            prefer: "resolution=ignore-duplicates,return=representation",
          },
          method: "POST",
        });

        expect(ignored.status).toBe(201);
        await expect(ignored.json()).resolves.toEqual([]);

        const merged = await fetch(
          `${restUrl}/twitch_users?on_conflict=twitch_user_id&select=id,name`,
          {
            body: JSON.stringify({
              name: "Merged",
              talent_id: user?.talent_id,
              twitch_user_id: user?.twitch_user_id,
            }),
            headers: {
              prefer: "resolution=merge-duplicates,return=representation",
            },
            method: "POST",
          }
        );

        expect(merged.status).toBe(201);
        await expect(merged.json()).resolves.toEqual([
          { id: user?.id, name: "Merged" },
        ]);
      } finally {
        await fetch(`${restUrl}/twitch_users?id=eq.${user?.id}`, {
          body: JSON.stringify({ name: user?.name }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
      }
    });

    it("should reject an update that breaks a unique constraint", async () => {
      const [first, second] = (await (
        await fetch(`${restUrl}/terms?select=id,term&limit=2`)
      ).json()) as { id: string; term: string }[];

      expect(second).toBeDefined();

      const response = await fetch(`${restUrl}/terms?id=eq.${second?.id}`, {
        body: JSON.stringify({ term: first?.term }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toMatchObject({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "terms_term_key"',
      });
      await expect(
        (await fetch(`${restUrl}/terms?select=term&id=eq.${second?.id}`)).json()
      ).resolves.toEqual([{ term: second?.term }]);
    });

    async function createTerms(
      terms: { id?: string; popularity?: number | null; term: string }[]
    ): Promise<{ id: string; term: string; updated_at: string }[]> {
      const response = await fetch(
        `${restUrl}/terms?select=id,term,updated_at`,
        {
          body: JSON.stringify(
            terms.map((term) => ({ readings: [], synonyms: [], ...term }))
          ),
          headers: {
            "Content-Type": "application/json",
            prefer: "return=representation",
          },
          method: "POST",
        }
      );

      expect(response.status).toBe(201);

      return (await response.json()) as {
        id: string;
        term: string;
        updated_at: string;
      }[];
    }

    async function deleteTerms(ids: string[]) {
      await fetch(`${restUrl}/terms?id=in.(${ids.join(",")})`, {
        method: "DELETE",
      });
    }

    it("should not match null with eq.null, as in SQL", async () => {
      await expect(listIds("videos", "&deleted_at=eq.null")).resolves.toEqual(
        []
      );
      expect(
        (await listIds("videos", "&deleted_at=is.null")).length
      ).toBeGreaterThan(0);
    });

    it("should match booleans and quoted values with commas in an in filter", async () => {
      await expect(listIds("videos", "&visible=in.(true)")).resolves.toEqual(
        await listIds("videos", "&visible=eq.true")
      );

      const [term] = await createTerms([{ term: "カンマ,入りの用語" }]);

      try {
        await expect(
          listIds(
            "terms",
            `&term=in.(${encodeURIComponent('"カンマ,入りの用語",ほかの用語')})`
          )
        ).resolves.toEqual([term?.id]);
      } finally {
        await deleteTerms([term?.id ?? ""]);
      }
    });

    it("should not write when a single object is requested and several rows match", async () => {
      const terms = await createTerms([
        { term: "単数のテスト用の用語1" },
        { term: "単数のテスト用の用語2" },
      ]);
      const ids = terms.map(({ id }) => id);
      const headers = {
        accept: "application/vnd.pgrst.object+json",
        "Content-Type": "application/json",
        prefer: "return=representation",
      };

      try {
        const patched = await fetch(
          `${restUrl}/terms?id=in.(${ids.join(",")})&select=id`,
          {
            body: JSON.stringify({ synonyms: ["x"] }),
            headers,
            method: "PATCH",
          }
        );
        const deleted = await fetch(
          `${restUrl}/terms?id=in.(${ids.join(",")})&select=id`,
          { headers, method: "DELETE" }
        );

        expect(patched.status).toBe(406);
        expect(deleted.status).toBe(406);
        await expect(
          (
            await fetch(
              `${restUrl}/terms?select=id,synonyms&id=in.(${ids.join(",")})`
            )
          ).json()
        ).resolves.toEqual(ids.map((id) => ({ id, synonyms: [] })));
      } finally {
        await deleteTerms(ids);
      }
    });

    it("should ignore duplicates within the same request", async () => {
      const id = crypto.randomUUID();
      const response = await fetch(`${restUrl}/terms?select=id,term`, {
        body: JSON.stringify([
          { id, readings: [], synonyms: [], term: "重複のテスト用の用語1" },
          { id, readings: [], synonyms: [], term: "重複のテスト用の用語2" },
        ]),
        headers: {
          "Content-Type": "application/json",
          prefer: "resolution=ignore-duplicates,return=representation",
        },
        method: "POST",
      });

      try {
        expect(response.status).toBe(201);
        await expect(response.json()).resolves.toEqual([
          { id, term: "重複のテスト用の用語1" },
        ]);
      } finally {
        await deleteTerms([id]);
      }
    });

    it("should set updated_at in a merge and reject updating a row twice", async () => {
      const [first, second] = await createTerms([
        { term: "マージのテスト用の用語1" },
        { term: "マージのテスト用の用語2" },
      ]);
      const upsert = (body: unknown) =>
        fetch(`${restUrl}/terms?select=term,updated_at`, {
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            prefer: "resolution=merge-duplicates,return=representation",
          },
          method: "POST",
        });

      try {
        const twice = await upsert([
          {
            id: first?.id,
            readings: [],
            synonyms: [],
            term: "マージのテスト用の用語3",
          },
          { id: first?.id, readings: [], synonyms: [], term: second?.term },
        ]);

        expect(twice.status).toBe(400);
        await expect(twice.json()).resolves.toMatchObject({ code: "21000" });
        await expect(
          (
            await fetch(
              `${restUrl}/terms?select=id,term&id=in.(${first?.id},${second?.id})&order=term.asc`
            )
          ).json()
        ).resolves.toEqual([
          { id: first?.id, term: first?.term },
          { id: second?.id, term: second?.term },
        ]);

        vi.spyOn(Temporal.Now, "instant").mockReturnValue(
          Temporal.Instant.from("2099-01-01T00:00:00Z")
        );

        const merged = await upsert({
          id: first?.id,
          readings: [],
          synonyms: [],
          term: "マージのテスト用の用語3",
        });

        expect(merged.status).toBe(201);
        await expect(merged.json()).resolves.toEqual([
          {
            term: "マージのテスト用の用語3",
            updated_at: "2099-01-01T00:00:00Z",
          },
        ]);
      } finally {
        vi.restoreAllMocks();
        await deleteTerms([first?.id ?? "", second?.id ?? ""]);
      }
    });

    it("should reject null in a NOT NULL column with a default and write nothing", async () => {
      const before = await listIds("terms");
      const response = await fetch(`${restUrl}/terms`, {
        body: JSON.stringify([
          { readings: [], synonyms: [], term: "NOT NULL のテスト用の用語1" },
          {
            popularity: null,
            readings: [],
            synonyms: [],
            term: "NOT NULL のテスト用の用語2",
          },
        ]),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        code: "23502",
        message:
          'null value in column "popularity" of relation "terms" violates not-null constraint',
      });
      await expect(listIds("terms")).resolves.toEqual(before);
    });

    it("should undo a write when a row does not match the schema", async () => {
      const before = await listIds("terms");
      const error = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        const response = await fetch(`${restUrl}/terms`, {
          body: JSON.stringify([
            { readings: [], synonyms: [], term: "スキーマのテスト用の用語1" },
            {
              readings: "not an array",
              synonyms: [],
              term: "スキーマのテスト用の用語2",
            },
          ]),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ code: "22P02" });
        await expect(listIds("terms")).resolves.toEqual(before);
      } finally {
        error.mockRestore();
      }
    });

    it("should pick the latest backfill job by instant, not by text", async () => {
      const [latest] = (await (
        await fetch(
          `${restUrl}/video_backfill_latest_jobs?select=*&platform=eq.youtube`
        )
      ).json()) as {
        account_id: string;
        platform: string;
        talent_id: string;
      }[];

      expect(latest).toBeDefined();

      const job = {
        account_id: latest?.account_id,
        platform: latest?.platform,
        talent_id: latest?.talent_id,
      };
      const created = await fetch(`${restUrl}/video_backfill_jobs?select=id`, {
        body: JSON.stringify([
          // 2099-01-01T01:00:00Z, which comes after the other one as text
          {
            ...job,
            finished_at: "2099-01-01T10:00:00+09:00",
            requested_at: "2099-01-01T00:00:00Z",
            status: "done",
          },
          {
            ...job,
            finished_at: "2099-01-01T02:00:00Z",
            requested_at: "2099-01-01T00:30:00Z",
            status: "failed",
          },
        ]),
        headers: {
          "Content-Type": "application/json",
          prefer: "return=representation",
        },
        method: "POST",
      });
      const ids = ((await created.json()) as { id: string }[]).map(
        ({ id }) => id
      );

      try {
        expect(created.status).toBe(201);
        await expect(
          (
            await fetch(
              `${restUrl}/video_backfill_latest_jobs?select=status&account_id=eq.${latest?.account_id}`
            )
          ).json()
        ).resolves.toEqual([{ status: "failed" }]);
      } finally {
        await fetch(`${restUrl}/video_backfill_jobs?id=in.(${ids.join(",")})`, {
          method: "DELETE",
        });
      }
    });

    it("should match nothing with an empty in list and compare quoted values by type", async () => {
      await expect(listIds("terms", "&popularity=in.()")).resolves.toEqual([]);
      await expect(
        listIds("terms", `&popularity=in.(${encodeURIComponent('"0"')})`)
      ).resolves.toEqual(await listIds("terms", "&popularity=in.(0)"));
      expect(
        (await listIds("terms", "&popularity=in.(0)")).length
      ).toBeGreaterThan(0);
    });

    it("should check NOT NULL columns of rows that an upsert ignores", async () => {
      const before = await listIds("terms");
      const id = crypto.randomUUID();
      const response = await fetch(`${restUrl}/terms`, {
        body: JSON.stringify([
          { id, readings: [], synonyms: [], term: "無視のテスト用の用語1" },
          {
            id,
            popularity: null,
            readings: [],
            synonyms: [],
            term: "無視のテスト用の用語2",
          },
        ]),
        headers: {
          "Content-Type": "application/json",
          prefer: "resolution=ignore-duplicates",
        },
        method: "POST",
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({ code: "23502" });
      await expect(listIds("terms")).resolves.toEqual(before);
    });

    it("should read the latest backfill jobs with a timestamp without an offset", async () => {
      const [latest] = (await (
        await fetch(
          `${restUrl}/video_backfill_latest_jobs?select=*&platform=eq.youtube`
        )
      ).json()) as {
        account_id: string;
        platform: string;
        talent_id: string;
      }[];
      const created = await fetch(`${restUrl}/video_backfill_jobs?select=id`, {
        body: JSON.stringify({
          account_id: latest?.account_id,
          finished_at: "2099-01-01T00:00:00",
          platform: latest?.platform,
          requested_at: "2099-01-01T00:00:00Z",
          status: "failed",
          talent_id: latest?.talent_id,
        }),
        headers: {
          "Content-Type": "application/json",
          prefer: "return=representation",
        },
        method: "POST",
      });
      const [job] = (await created.json()) as { id: string }[];

      try {
        const response = await fetch(
          `${restUrl}/video_backfill_latest_jobs?select=id&account_id=eq.${latest?.account_id}`
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual([{ id: job?.id }]);
      } finally {
        await fetch(`${restUrl}/video_backfill_jobs?id=eq.${job?.id}`, {
          method: "DELETE",
        });
      }
    });

    it("should not serve tables that do not exist", async () => {
      const response = await fetch(`${restUrl}/channels?select=id`);

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        code: "PGRST205",
        details: null,
        hint: expect.any(String),
        message:
          "Could not find the table 'public.channels' in the schema cache",
      });
    });

    it("should not write to tables that do not exist", async () => {
      const response = await fetch(`${restUrl}/channels`, {
        body: JSON.stringify({ name: "x" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(404);
      expect(((await response.json()) as { code: string }).code).toBe(
        "PGRST205"
      );
    });

    it("should not call functions that do not exist", async () => {
      const response = await fetch(`${restUrl}/rpc/no_such_function`, {
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(404);
      expect(((await response.json()) as { code: string }).code).toBe(
        "PGRST202"
      );
    });
  });

  describe("Profile images", () => {
    it("should embed channel icons and leave channels without one as null", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/youtube_channels?select=id,profile_image:profile_images(id,path,width,height,blur_data_url)"
      );
      const data = (await response.json()) as {
        id: string;
        profile_image: unknown;
      }[];

      expect(response.ok).toBe(true);
      expect(data.length).toBeGreaterThan(1);

      const withIcon = data.filter((channel) => channel.profile_image);

      expect(withIcon.length).toBeGreaterThan(0);
      expect(withIcon.length).toBeLessThan(data.length);
      expect(withIcon[0]).toEqual({
        id: expect.any(String),
        profile_image: {
          blur_data_url: expect.stringMatching(/^data:image\/jpeg;base64,/),
          height: 256,
          id: expect.any(String),
          path: expect.stringMatching(/^youtube\/UC\w+\/\w+\.webp$/),
          width: 256,
        },
      });
    });

    it("should embed channels and their icons from YouTube videos", async () => {
      const select =
        "id,youtube_video:youtube_videos(youtube_video_id,youtube_channel:youtube_channels(name,youtube_handle,profile_image:profile_images(blur_data_url,id)))";
      const response = await fetch(
        `https://fake.supabase.test/rest/v1/videos?select=${encodeURIComponent(select)}&platform=eq.youtube`
      );
      const data = (await response.json()) as {
        id: string;
        youtube_video: {
          youtube_channel: {
            name: string | null;
            profile_image: { blur_data_url: string; id: string } | null;
          } | null;
          youtube_video_id: string;
        } | null;
      }[];

      expect(response.ok).toBe(true);

      const channels = data.map(
        (video) => video.youtube_video?.youtube_channel
      );

      expect(channels.every((channel) => channel?.name)).toBe(true);
      expect(channels.some((channel) => channel?.profile_image)).toBe(true);
      expect(channels.some((channel) => channel?.profile_image === null)).toBe(
        true
      );
    });

    it("should apply the select of search_videos_v4", async () => {
      const select =
        "id,talent:talents(id,name),youtube_video:youtube_videos(youtube_video_id,youtube_channel:youtube_channels(name,profile_image:profile_images(id)))";
      const search = async (perpage: number) => {
        const response = await fetch(
          `https://fake.supabase.test/rest/v1/rpc/search_videos_v4?select=${encodeURIComponent(select)}`,
          {
            body: JSON.stringify({ p_perpage: perpage, p_query: "" }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }
        );

        expect(response.ok).toBe(true);

        return (await response.json()) as Record<string, unknown>[];
      };

      const data = await search(3);

      expect(data).toHaveLength(3);
      expect(Object.keys(data[0] ?? {}).sort()).toEqual([
        "id",
        "talent",
        "youtube_video",
      ]);
      expect(
        (await search(100)).find((video) => video["youtube_video"])
      ).toMatchObject({
        youtube_video: {
          youtube_channel: { name: expect.any(String) },
          youtube_video_id: expect.any(String),
        },
      });
    });

    it("should look up a profile image by id", async () => {
      const channels = (await (
        await fetch(
          "https://fake.supabase.test/rest/v1/youtube_channels?select=profile_image_id"
        )
      ).json()) as { profile_image_id: string | null }[];
      const id = channels.find(
        (channel) => channel.profile_image_id
      )?.profile_image_id;

      const response = await fetch(
        `https://fake.supabase.test/rest/v1/profile_images?select=path&id=eq.${id}`
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual([{ path: expect.stringMatching(/\.webp$/) }]);
    });

    it("should sign and serve objects in the profile-images bucket", async () => {
      const signResponse = await fetch(
        "https://fake.supabase.test/storage/v1/object/sign/profile-images/youtube/UC1/a.webp",
        { method: "POST" }
      );
      const { signedURL } = (await signResponse.json()) as {
        signedURL: string;
      };

      expect(signedURL).toBe(
        "https://fake.supabase.test/storage/v1/object/public/profile-images/youtube/UC1/a.webp"
      );

      const imageResponse = await fetch(signedURL);

      expect(imageResponse.ok).toBe(true);
      expect(imageResponse.headers.get("content-type")).toBe("image/svg+xml");
      await expect(imageResponse.text()).resolves.toContain(
        'width="256" height="256"'
      );
    });

    it("should download objects in the profile-images bucket", async () => {
      const response = await fetch(
        "https://fake.supabase.test/storage/v1/object/profile-images/youtube/UC1/a.webp"
      );

      expect(response.ok).toBe(true);
      expect(response.headers.get("content-type")).toBe("image/svg+xml");
      await expect(response.text()).resolves.toContain("<rect");
    });
  });

  describe("Twitch users", () => {
    interface TwitchUserRow {
      id: string;
      profile_image: { path: string; width: number } | null;
      twitch_login_name: string;
      twitch_user_id: string;
    }

    async function getTwitchUsers(): Promise<TwitchUserRow[]> {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/twitch_users?select=id,twitch_user_id,twitch_login_name,profile_image:profile_images(path,width)"
      );

      return (await response.json()) as TwitchUserRow[];
    }

    it("should return Twitch users with and without an icon", async () => {
      const users = await getTwitchUsers();

      expect(users).toHaveLength(2);
      expect(users.map((user) => user.profile_image)).toEqual(
        expect.arrayContaining([
          {
            path: expect.stringMatching(/^twitch\/\d+\/\w+\.webp$/),
            width: 256,
          },
          null,
        ])
      );
    });

    it("should embed Twitch users from talents", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/talents?select=id,twitch_users(id,twitch_user_id)"
      );
      const talents = (await response.json()) as {
        twitch_users: { id: string }[];
      }[];

      expect(talents.flatMap((talent) => talent.twitch_users)).toHaveLength(2);
    });

    it("should match digit-only IDs and case-insensitive logins", async () => {
      const [user] = await getTwitchUsers();

      const byId = (await (
        await fetch(
          `https://fake.supabase.test/rest/v1/twitch_users?select=id&twitch_user_id=eq.${user?.twitch_user_id}`
        )
      ).json()) as { id: string }[];
      const byLogin = (await (
        await fetch(
          `https://fake.supabase.test/rest/v1/twitch_users?select=id&twitch_login_name=ilike.${user?.twitch_login_name.toUpperCase()}`
        )
      ).json()) as { id: string }[];

      expect(byId).toEqual([{ id: user?.id }]);
      expect(byLogin).toEqual([{ id: user?.id }]);
    });

    it("should insert, reject duplicates and delete Twitch users", async () => {
      const [talent] = (await (
        await fetch("https://fake.supabase.test/rest/v1/talents?select=id")
      ).json()) as { id: string }[];
      const newUser = {
        name: "New User",
        talent_id: talent?.id,
        twitch_login_name: "new_user",
        twitch_user_id: "999999999",
      };

      const created = await fetch(
        "https://fake.supabase.test/rest/v1/twitch_users?select=id,twitch_user_id",
        {
          body: JSON.stringify(newUser),
          headers: { Prefer: "return=representation" },
          method: "POST",
        }
      );
      const [createdUser] = (await created.json()) as {
        id: string;
        twitch_user_id: string;
      }[];

      expect(created.status).toBe(201);
      expect(createdUser?.twitch_user_id).toBe("999999999");

      const duplicate = await fetch(
        "https://fake.supabase.test/rest/v1/twitch_users",
        { body: JSON.stringify(newUser), method: "POST" }
      );

      expect(duplicate.status).toBe(409);

      const deleted = await fetch(
        `https://fake.supabase.test/rest/v1/twitch_users?id=eq.${createdUser?.id}`,
        { method: "DELETE" }
      );

      expect(deleted.status).toBe(204);
      await expect(getTwitchUsers()).resolves.toHaveLength(2);
    });
  });

  describe("Twitch videos", () => {
    // The select of the public site (apps/web/lib/data/selects.ts)
    const select = [
      "id",
      "platform",
      "published_at",
      "status",
      "talent:talents!inner(id,name)",
      "youtube_video:youtube_videos(youtube_video_id)",
      "twitch_video:twitch_videos(twitch_video_id,type,twitch_user:twitch_users(name,twitch_login_name,profile_image:profile_images(blur_data_url,id)))",
    ].join(",");

    interface VideoRow {
      id: string;
      platform: "youtube" | "twitch";
      published_at: string;
      status: string;
      talent: { id: string; name: string };
      twitch_video: {
        twitch_user: {
          name: string | null;
          profile_image: { blur_data_url: string; id: string } | null;
          twitch_login_name: string | null;
        } | null;
        twitch_video_id: string;
        type: string | null;
      } | null;
      youtube_video: { youtube_video_id: string } | null;
    }

    async function searchVideos(
      body: Record<string, unknown>
    ): Promise<VideoRow[]> {
      const response = await fetch(
        `https://fake.supabase.test/rest/v1/rpc/search_videos_v4?select=${encodeURIComponent(select)}`,
        {
          body: JSON.stringify({ p_query: "", ...body }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      expect(response.ok).toBe(true);

      return (await response.json()) as VideoRow[];
    }

    it("should seed Twitch videos of each type and status", async () => {
      const response = await fetch(
        `https://fake.supabase.test/rest/v1/twitch_videos?select=${encodeURIComponent("stream_id,twitch_video_id,type,video:videos(platform,status)")}`
      );
      const data = (await response.json()) as {
        stream_id: string | null;
        twitch_video_id: string;
        type: string | null;
        video: { platform: string; status: string };
      }[];

      expect(response.ok).toBe(true);
      expect(data.every((row) => row.video.platform === "twitch")).toBe(true);
      expect(new Set(data.map((row) => row.type))).toEqual(
        new Set(["archive", "clip", "highlight", "upload", null])
      );
      expect(new Set(data.map((row) => row.video.status))).toEqual(
        new Set(["ENDED", "LIVE", "PUBLISHED", "UPCOMING"])
      );

      // A broadcast on air keeps a placeholder of its stream
      const live = data.find((row) => row.video.status === "LIVE");

      expect(live?.twitch_video_id).toBe(`live:${live?.stream_id}`);
    });

    it("should embed Twitch videos and their users from videos", async () => {
      const response = await fetch(
        `https://fake.supabase.test/rest/v1/videos?select=${encodeURIComponent(select)}`
      );
      const data = (await response.json()) as VideoRow[];

      expect(response.ok).toBe(true);

      const twitchVideos = data.filter((video) => video.platform === "twitch");

      expect(twitchVideos.length).toBeGreaterThan(0);
      for (const video of data) {
        if (video.platform === "twitch") {
          expect(video.youtube_video).toBeNull();
          expect(video.twitch_video).toEqual({
            twitch_user: {
              name: video.talent.name,
              profile_image: expect.toBeOneOf([
                { blur_data_url: expect.any(String), id: expect.any(String) },
                null,
              ]),
              twitch_login_name: expect.any(String),
            },
            twitch_video_id: expect.any(String),
            type: expect.toBeOneOf([
              "archive",
              "highlight",
              "upload",
              "clip",
              null,
            ]),
          });
        } else {
          expect(video.twitch_video).toBeNull();
          expect(video.youtube_video).not.toBeNull();
        }
      }

      const profileImages = twitchVideos.map(
        (video) => video.twitch_video?.twitch_user?.profile_image
      );

      expect(profileImages.some((image) => image)).toBe(true);
      expect(profileImages.some((image) => image === null)).toBe(true);
    });

    it("should embed Twitch videos from Twitch users and filter by user", async () => {
      const users = (await (
        await fetch(
          "https://fake.supabase.test/rest/v1/twitch_users?select=id,twitch_videos(id)"
        )
      ).json()) as { id: string; twitch_videos: { id: string }[] }[];

      expect(users).toHaveLength(2);
      expect(users.every((user) => user.twitch_videos.length > 0)).toBe(true);

      const [user] = users;
      const response = await fetch(
        `https://fake.supabase.test/rest/v1/twitch_videos?select=video_id&twitch_user_id=eq.${user?.id}`
      );
      const rows = (await response.json()) as { video_id: string }[];

      expect(rows).toHaveLength(user?.twitch_videos.length ?? -1);
    });

    it("should search videos newest first, including Twitch videos", async () => {
      const data = await searchVideos({ p_perpage: 100 });
      const publishedAt = data.map((video) => video.published_at);

      expect(publishedAt).toEqual(
        [...publishedAt].sort((a, b) => Temporal.Instant.compare(b, a))
      );
      expect(
        data.some((video) => video.twitch_video?.twitch_user?.twitch_login_name)
      ).toBe(true);

      // The Twitch videos are among the latest up to now, so the first page
      // shows them. Upcoming streams of the schedule come later than now.
      // Which videos come first depends on now (the streams of the schedule
      // that just ended, or the YouTube videos on air), so the data is seeded
      // around a fixed now and seeded again around the current time after.
      const now = Temporal.Instant.from("2026-11-15T12:34:56.789Z");

      try {
        await seedCollections({ now });

        const firstPage = await searchVideos({
          p_perpage: 6,
          p_until: now.toString(),
        });

        expect(firstPage.some((video) => video.platform === "twitch")).toBe(
          true
        );
      } finally {
        await seedCollections();
      }
    });

    it("should search only videos published before until", async () => {
      const until = Temporal.Now.instant().toString();
      const data = await searchVideos({ p_perpage: 100, p_until: until });

      expect(data.length).toBeGreaterThan(0);
      expect(
        data.every(
          (video) => Temporal.Instant.compare(video.published_at, until) < 0
        )
      ).toBe(true);
      expect(data.some((video) => video.status === "UPCOMING")).toBe(false);
    });

    it("should search only videos of the given talents", async () => {
      const [video] = await searchVideos({ p_perpage: 1 });
      const data = await searchVideos({
        p_perpage: 100,
        p_talent_ids: [video?.talent.id],
      });

      expect(data.length).toBeGreaterThan(0);
      expect(data.every((row) => row.talent.id === video?.talent.id)).toBe(
        true
      );
    });

    it("should search only videos whose titles match the query", async () => {
      const searchTitles = async (query: string) => {
        const response = await fetch(
          "https://fake.supabase.test/rest/v1/rpc/search_videos_v4?select=title",
          {
            body: JSON.stringify({ p_perpage: 100, p_query: query }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }
        );

        expect(response.ok).toBe(true);

        return ((await response.json()) as { title: string }[]).map(
          (video) => video.title
        );
      };

      // The seeded Twitch videos always have these titles and are visible,
      // unlike the YouTube videos whose statuses are random.
      const twitchTitles = [
        "【Twitch】明日の夜は耐久配信！",
        "【Twitch】まったり雑談配信中",
        "【Twitch】深夜のゲーム配信アーカイブ",
        "【Twitch】ハイライト：先週の配信まとめ",
        "【Twitch】アップロード動画：自己紹介",
      ];

      await expect(searchTitles("Twitch")).resolves.toEqual(twitchTitles);
      // Full-width and lower-case letters match like PGroonga's normalizer.
      await expect(searchTitles("ｔｗｉｔｃｈ")).resolves.toEqual(twitchTitles);
      await expect(searchTitles("zzzzzzzzqqq")).resolves.toEqual([]);
    });

    it("should embed Twitch videos in search_videos_v4 without a select", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/rpc/search_videos_v4",
        {
          body: JSON.stringify({ p_perpage: 100, p_query: "" }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
      const data = (await response.json()) as VideoRow[];

      expect(response.ok).toBe(true);
      expect(data.find((video) => video.platform === "twitch")).toMatchObject({
        twitch_video: {
          twitch_user: { twitch_login_name: expect.any(String) },
          twitch_video_id: expect.any(String),
        },
        youtube_video: null,
      });
    });

    it("should search only videos of the given kinds in search_videos_v4", async () => {
      const searchKinds = async (videoKinds?: string[]) => {
        const response = await fetch(
          "https://fake.supabase.test/rest/v1/rpc/search_videos_v4?select=video_kind",
          {
            body: JSON.stringify({
              p_perpage: 1000,
              p_query: "",
              ...(videoKinds ? { p_video_kinds: videoKinds } : {}),
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }
        );

        expect(response.ok).toBe(true);

        return new Set(
          ((await response.json()) as { video_kind: string }[]).map(
            (video) => video.video_kind
          )
        );
      };

      await expect(searchKinds()).resolves.toEqual(
        new Set(["short", "standard"])
      );
      await expect(searchKinds(["short"])).resolves.toEqual(new Set(["short"]));
      await expect(searchKinds(["standard"])).resolves.toEqual(
        new Set(["standard"])
      );
    });

    it("should count the videos the site shows in count_videos_v2", async () => {
      const post = async (url: string, body: object) => {
        const response = await fetch(url, {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        expect(response.ok).toBe(true);

        return (await response.json()) as unknown;
      };
      const select =
        "id,talent:talents(deleted_at),youtube_video:youtube_videos(youtube_video_id),twitch_video:twitch_videos(twitch_video_id)";

      for (const body of [
        { p_query: "" },
        { p_query: "Twitch" },
        { p_query: "", p_video_kinds: ["short"] },
      ]) {
        const videos = (await post(
          `https://fake.supabase.test/rest/v1/rpc/search_videos_v4?select=${encodeURIComponent(select)}`,
          { ...body, p_perpage: 1000 }
        )) as {
          talent: { deleted_at: string | null } | null;
          twitch_video: unknown;
          youtube_video: unknown;
        }[];
        // The site drops the videos of deleted talents and the videos with
        // neither a YouTube nor a Twitch video.
        const shownVideos = videos.filter(
          (video) =>
            video.talent?.deleted_at === null &&
            (video.youtube_video !== null || video.twitch_video !== null)
        );

        expect(shownVideos.length).toBeGreaterThan(0);
        await expect(
          post("https://fake.supabase.test/rest/v1/rpc/count_videos_v2", body)
        ).resolves.toBe(shownVideos.length);
      }
    });

    it("should leave out the videos the site does not show before the page size in search_videos_v4", async () => {
      const restUrl = "https://fake.supabase.test/rest/v1";
      const select =
        "id,talent:talents(deleted_at),youtube_video:youtube_videos(youtube_video_id),twitch_video:twitch_videos(twitch_video_id)";
      const search = async (perpage: number) => {
        const response = await fetch(
          `${restUrl}/rpc/search_videos_v4?select=id`,
          {
            body: JSON.stringify({ p_perpage: perpage, p_query: "" }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }
        );

        expect(response.ok).toBe(true);

        return ((await response.json()) as { id: string }[]).map(
          (video) => video.id
        );
      };
      const [shownVideo] = (await (
        await fetch(`${restUrl}/videos?select=id,talent_id&limit=1`)
      ).json()) as { id: string; talent_id: string }[];

      expect(shownVideo).toBeDefined();

      // The newest videos are a video of a deleted talent and a video with
      // neither a YouTube nor a Twitch video
      const hiddenVideoIds = [
        "00000000-0000-4000-8000-0000000000f1",
        "00000000-0000-4000-8000-0000000000f2",
      ];
      const created = await fetch(`${restUrl}/videos`, {
        body: JSON.stringify(
          [MOCK_DELETED_TALENT_ID, shownVideo?.talent_id].map(
            (talentId, idx) => ({
              duration: "PT1H",
              id: hiddenVideoIds[idx],
              platform: "youtube",
              published_at: `2099-01-0${idx + 1}T00:00:00.000Z`,
              talent_id: talentId,
              title: "Hidden video",
            })
          )
        ),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(created.status).toBe(201);

      try {
        // The videos the search matches, newest first, before the videos the
        // site does not show are left out
        const matchedVideos = (await (
          await fetch(
            `${restUrl}/videos?select=${encodeURIComponent(select)}&deleted_at=is.null&visible=is.true&order=published_at.desc`
          )
        ).json()) as {
          id: string;
          talent: { deleted_at: string | null } | null;
          twitch_video: unknown;
          youtube_video: unknown;
        }[];
        const shownVideoIds = matchedVideos
          .filter(
            (video) =>
              video.talent?.deleted_at === null &&
              (video.youtube_video !== null || video.twitch_video !== null)
          )
          .map((video) => video.id);

        expect(shownVideoIds.length).toBeGreaterThan(2);

        expect(matchedVideos.slice(0, 2).map((video) => video.id)).toEqual(
          hiddenVideoIds.toReversed()
        );
        await expect(search(2)).resolves.toEqual(shownVideoIds.slice(0, 2));
        await expect(search(1000)).resolves.toEqual(shownVideoIds);
      } finally {
        await fetch(`${restUrl}/videos?id=in.(${hiddenVideoIds.join(",")})`, {
          method: "DELETE",
        });
      }
    });
  });

  describe("Soft-deleting and restoring videos", () => {
    const restUrl = "https://fake.supabase.test/rest/v1";

    async function callRpc(name: string, params: Record<string, unknown>) {
      const response = await fetch(`${restUrl}/rpc/${name}`, {
        body: JSON.stringify(params),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(200);

      return (await response.json()) as string[];
    }

    async function getStates(ids: string[]) {
      return (await (
        await fetch(
          `${restUrl}/videos?select=id,deleted_at,deleted_reason,thumbnail:thumbnails(deleted_at)&id=in.(${ids.join(",")})&order=id.asc`
        )
      ).json()) as {
        deleted_at: string | null;
        deleted_reason: string | null;
        id: string;
        thumbnail: { deleted_at: string | null } | null;
      }[];
    }

    it("should delete and restore the videos with their thumbnails, like the functions", async () => {
      const videos = (await (
        await fetch(
          `${restUrl}/videos?select=id&deleted_at=is.null&thumbnail_id=not.is.null&order=id.asc&limit=2`
        )
      ).json()) as { id: string }[];
      const ids = videos.map((video) => video.id);
      const deletedAt = "2026-11-18T00:00:00Z";

      expect(ids).toHaveLength(2);

      try {
        await expect(
          callRpc("soft_delete_videos", {
            p_deleted_at: deletedAt,
            p_reason: "withdrawn",
            p_video_ids: ids,
          })
        ).resolves.toEqual(ids);
        await expect(getStates(ids)).resolves.toEqual(
          ids.map((id) => ({
            deleted_at: deletedAt,
            deleted_reason: "withdrawn",
            id,
            thumbnail: { deleted_at: deletedAt },
          }))
        );

        // A deleted video keeps its reason and time.
        await expect(
          callRpc("soft_delete_videos", {
            p_deleted_at: "2026-11-19T00:00:00Z",
            p_reason: "talent_deleted",
            p_video_ids: ids,
          })
        ).resolves.toEqual([]);
        // A video deleted for another reason is not restored with a reason.
        await expect(
          callRpc("restore_videos", {
            p_reason: "talent_deleted",
            p_video_ids: ids,
          })
        ).resolves.toEqual([]);
        expect(
          (await getStates(ids)).map((video) => video.deleted_reason)
        ).toEqual(["withdrawn", "withdrawn"]);

        await expect(
          callRpc("restore_videos", { p_video_ids: ids })
        ).resolves.toEqual(ids);
        await expect(getStates(ids)).resolves.toEqual(
          ids.map((id) => ({
            deleted_at: null,
            deleted_reason: null,
            id,
            thumbnail: { deleted_at: null },
          }))
        );
      } finally {
        await callRpc("restore_videos", { p_video_ids: ids });
      }
    });
  });

  describe("Touching rows", () => {
    const restUrl = "https://fake.supabase.test/rest/v1";

    it.each([
      ["touch_talent", "talents", "p_talent_id"],
      ["touch_thumbnail", "thumbnails", "p_thumbnail_id"],
    ])(
      "should move updated_at of the row with %s, like the trigger",
      async (name, table, param) => {
        const [row] = (await (
          await fetch(`${restUrl}/${table}?select=*&limit=1`)
        ).json()) as ({ id: string; updated_at: string } & Record<
          string,
          unknown
        >)[];

        expect(row).toBeDefined();

        const response = await fetch(`${restUrl}/rpc/${name}`, {
          body: JSON.stringify({ [param]: row?.id }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        expect(response.status).toBe(204);

        const [touched] = (await (
          await fetch(`${restUrl}/${table}?select=*&id=eq.${row?.id}`)
        ).json()) as ({ updated_at: string } & Record<string, unknown>)[];

        expect(touched?.updated_at).not.toBe(row?.updated_at);
        expect(touched?.updated_at).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
        );
        expect({ ...touched, updated_at: undefined }).toEqual({
          ...row,
          updated_at: undefined,
        });
      }
    );
  });

  describe("Inserting videos", () => {
    const restUrl = "https://fake.supabase.test/rest/v1";

    async function insertVideo(
      youtubeVideoId: string,
      channel: { id: string; talent_id: string }
    ) {
      const response = await fetch(`${restUrl}/rpc/insert_video`, {
        body: JSON.stringify({
          p_platform: "youtube",
          p_platform_video: {
            youtube_channel_id: channel.id,
            youtube_video_id: youtubeVideoId,
          },
          p_video: {
            duration: "PT10M",
            platform: "youtube",
            published_at: "2099-01-01T00:00:00Z",
            status: "PUBLISHED",
            talent_id: channel.talent_id,
            title: "Inserted video",
          },
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(200);

      return (await response.json()) as string | null;
    }

    it("should insert the video with its platform row, and nothing when it is already saved", async () => {
      const [channel] = (await (
        await fetch(`${restUrl}/youtube_channels?select=id,talent_id&limit=1`)
      ).json()) as { id: string; talent_id: string }[];
      const [saved] = (await (
        await fetch(`${restUrl}/youtube_videos?select=youtube_video_id&limit=1`)
      ).json()) as { youtube_video_id: string }[];

      if (!channel || !saved) {
        throw new Error("The seed has no YouTube channels or videos");
      }

      const videoId = await insertVideo("inserted-video-1", channel);

      try {
        expect(videoId).toEqual(expect.any(String));
        await expect(
          (
            await fetch(
              `${restUrl}/videos?select=title,status,visible,youtube_video:youtube_videos(youtube_channel_id,youtube_video_id)&id=eq.${videoId}`
            )
          ).json()
        ).resolves.toEqual([
          {
            status: "PUBLISHED",
            title: "Inserted video",
            visible: true,
            youtube_video: {
              youtube_channel_id: channel.id,
              youtube_video_id: "inserted-video-1",
            },
          },
        ]);

        const count = async () =>
          (
            (await (
              await fetch(`${restUrl}/videos?select=id&title=eq.Inserted video`)
            ).json()) as unknown[]
          ).length;

        await expect(insertVideo("inserted-video-1", channel)).resolves.toBe(
          null
        );
        await expect(
          insertVideo(saved.youtube_video_id, channel)
        ).resolves.toBeNull();
        await expect(count()).resolves.toBe(1);
      } finally {
        await fetch(`${restUrl}/youtube_videos?video_id=eq.${videoId}`, {
          method: "DELETE",
        });
        await fetch(`${restUrl}/videos?id=eq.${videoId}`, { method: "DELETE" });
      }
    });
  });

  describe("Term popularity", () => {
    it("should count the terms matching the given terms, ignoring the case", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/rpc/update_terms_popularity",
        {
          body: JSON.stringify({
            p_items: [
              { score: 10, term: "asmr" },
              { score: 5, term: "歌枠" },
              { score: 1, term: "unknown" },
              { term: "コラボ" },
            ],
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      expect(response.ok).toBe(true);
      await expect(response.json()).resolves.toBe(2);
    });
  });

  describe("Search suggestions", () => {
    async function suggest(query: string) {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/rpc/suggestions_v2",
        {
          body: JSON.stringify({ p_query: query }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      expect(response.ok).toBe(true);

      return (await response.json()) as { priority: number; term: string }[];
    }

    it("should suggest terms that start with the query", async () => {
      await expect(suggest("歌")).resolves.toEqual([
        { priority: 1, term: "歌枠" },
      ]);
      await expect(suggest("asm")).resolves.toEqual([
        { priority: 1, term: "ASMR" },
      ]);
    });

    it("should suggest terms whose readings start with the query", async () => {
      await expect(suggest("うた")).resolves.toEqual([
        { priority: 2, term: "歌枠" },
      ]);
      await expect(suggest("コラ")).resolves.toEqual([
        { priority: 1, term: "コラボ" },
      ]);
      await expect(suggest("こら")).resolves.toEqual([
        { priority: 1, term: "コラボ" },
      ]);
    });

    it("should suggest terms whose synonyms start with the query", async () => {
      await expect(suggest("歌配")).resolves.toEqual([
        { priority: 3, term: "歌枠" },
      ]);
      await expect(suggest("カラオケ")).resolves.toEqual([
        { priority: 3, term: "歌枠" },
      ]);
      await expect(suggest("共")).resolves.toEqual([
        { priority: 3, term: "コラボ" },
      ]);
    });

    it("should suggest a term once with its best priority", async () => {
      await expect(suggest("コラボ")).resolves.toEqual([
        { priority: 1, term: "コラボ" },
      ]);
      await expect(suggest("ゲーム")).resolves.toEqual([
        { priority: 1, term: "ゲーム配信" },
      ]);
    });

    it("should suggest nothing when no term matches", async () => {
      await expect(suggest("zzzzzzzzqqq")).resolves.toEqual([]);
    });
  });

  describe("Video backfill history", () => {
    interface BackfillRow {
      account_id: string;
      finished_at: string;
      platform: "youtube" | "twitch";
      status: "done" | "failed";
      talents: { name: string } | null;
    }

    it("should return the history newest first with talent names", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/video_backfill_jobs?select=account_id,platform,status,finished_at,talents(name)&order=finished_at.desc&limit=50"
      );
      const rows = (await response.json()) as BackfillRow[];

      expect(rows).toHaveLength(3);
      expect(rows.map((row) => row.finished_at)).toEqual(
        rows
          .map((row) => row.finished_at)
          .sort()
          .reverse()
      );
      expect(rows.every((row) => typeof row.talents?.name === "string")).toBe(
        true
      );
    });

    it("should return only the latest job of each account", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/video_backfill_latest_jobs?select=account_id,platform,status"
      );
      const rows = (await response.json()) as BackfillRow[];

      expect(
        rows.map(({ platform, status }) => ({ platform, status }))
      ).toEqual(
        expect.arrayContaining([
          { platform: "twitch", status: "failed" },
          { platform: "youtube", status: "done" },
        ])
      );
      expect(rows).toHaveLength(2);
    });

    it("should count every matching row of a page", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/video_backfill_jobs?select=id&limit=1",
        { headers: { prefer: "count=exact" } }
      );

      await expect(response.json()).resolves.toHaveLength(1);
      expect(response.headers.get("content-range")).toBe("0-0/3");
    });

    it("should count every matching row in a HEAD request with a limit", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/video_backfill_jobs?select=id&limit=1",
        { headers: { prefer: "count=exact" }, method: "HEAD" }
      );

      expect(response.headers.get("content-range")).toBe("0-0/3");
    });

    it("should count the accounts whose latest job failed", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/video_backfill_latest_jobs?select=id&status=eq.failed",
        { headers: { prefer: "count=exact" }, method: "HEAD" }
      );

      expect(response.headers.get("content-range")).toBe("0-0/1");
    });
  });

  describe("Feature requests", () => {
    interface FeatureRequestRow {
      admin_memo: string | null;
      created_at: string;
      id: string;
      is_read: boolean;
      message: string;
      status: string;
      updated_at: string;
    }

    const url = "https://fake.supabase.test/rest/v1/feature_requests";

    async function listFeatureRequests(search = "") {
      const response = await fetch(
        `${url}?select=*&order=created_at.desc${search}`
      );

      return (await response.json()) as FeatureRequestRow[];
    }

    it("should return the seeded feature requests newest first", async () => {
      const rows = await listFeatureRequests();

      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows.map((row) => row.created_at)).toEqual(
        rows
          .map((row) => row.created_at)
          .sort()
          .reverse()
      );
    });

    it("should insert a feature request that the admin list and detail show", async () => {
      const message = `テスト用の機能要望 ${crypto.randomUUID()}`;
      const response = await fetch(url, {
        body: JSON.stringify({ message }),
        headers: {
          "Content-Type": "application/json",
          prefer: "return=minimal",
        },
        method: "POST",
      });

      expect(response.status).toBe(201);

      const [latest] = await listFeatureRequests();

      expect(latest).toMatchObject({
        admin_memo: null,
        is_read: false,
        message,
        status: "pending",
      });
      expect(latest?.created_at).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
      );

      const unread = await listFeatureRequests("&is_read=eq.false");

      expect(unread.some((row) => row.id === latest?.id)).toBe(true);

      const detail = await fetch(`${url}?select=*&id=eq.${latest?.id}`, {
        headers: { accept: "application/vnd.pgrst.object+json" },
      });

      expect(detail.status).toBe(200);
      await expect(detail.json()).resolves.toMatchObject({
        id: latest?.id,
        message,
      });
    });

    it("should return the inserted row when representation is requested", async () => {
      const response = await fetch(`${url}?select=id,message`, {
        body: JSON.stringify({ message: "一覧の並び順を変えたい" }),
        headers: {
          "Content-Type": "application/json",
          prefer: "return=representation",
        },
        method: "POST",
      });
      const rows = (await response.json()) as Pick<
        FeatureRequestRow,
        "id" | "message"
      >[];

      expect(response.status).toBe(201);
      expect(rows).toEqual([
        { id: expect.any(String), message: "一覧の並び順を変えたい" },
      ]);
    });

    it("should reject a feature request without a message", async () => {
      const response = await fetch(url, {
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      expect(((await response.json()) as { code: string }).code).toBe("23502");
    });

    it("should update the status, memo and read state", async () => {
      const [target] = await listFeatureRequests("&is_read=eq.false");

      expect(target).toBeDefined();

      for (const body of [
        { status: "in_progress" },
        { admin_memo: "検討中" },
        { is_read: true },
      ]) {
        const response = await fetch(`${url}?id=eq.${target?.id}`, {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });

        expect(response.status).toBe(204);
      }

      const [updated] = await listFeatureRequests(`&id=eq.${target?.id}`);

      expect(updated).toMatchObject({
        admin_memo: "検討中",
        is_read: true,
        status: "in_progress",
      });
    });
  });

  describe("Audit logs", () => {
    interface AuditLogRow {
      action: string;
      created_at: string;
      details: { entityName?: string } | null;
      id: string;
      target_record_id: string | null;
      target_table: string | null;
      user_email: string | null;
      user_id: string | null;
    }

    async function getAuditLogs(params: Record<string, unknown>) {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/rpc/get_audit_logs",
        {
          body: JSON.stringify(params),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      expect(response.status).toBe(200);

      return (await response.json()) as AuditLogRow[];
    }

    it("should return the seeded audit logs newest first with emails", async () => {
      const logs = await getAuditLogs({ p_limit: 10 });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.map((log) => log.created_at)).toEqual(
        logs
          .map((log) => log.created_at)
          .sort()
          .reverse()
      );
      expect(logs.every((log) => log.user_email === "admin@example.com")).toBe(
        true
      );
    });

    it("should apply the limit, offset and sort direction", async () => {
      const all = await getAuditLogs({});

      expect(all.length).toBeGreaterThanOrEqual(2);
      await expect(getAuditLogs({ p_limit: 1, p_offset: 1 })).resolves.toEqual([
        all[1],
      ]);
      await expect(getAuditLogs({ p_sort_direction: "asc" })).resolves.toEqual(
        [...all].reverse()
      );
    });

    it("should record an audit log that get_audit_logs returns", async () => {
      const targetRecordId = crypto.randomUUID();
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/rpc/insert_audit_log",
        {
          body: JSON.stringify({
            p_action: "TERM_UPDATE",
            p_details: { entityName: "歌枠" },
            p_target_record_id: targetRecordId,
            p_target_table: "terms",
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      expect(response.status).toBe(204);

      const [latest] = await getAuditLogs({ p_limit: 1 });

      expect(latest).toMatchObject({
        action: "TERM_UPDATE",
        details: { entityName: "歌枠" },
        target_record_id: targetRecordId,
        target_table: "terms",
        user_email: "admin@example.com",
      });
    });

    it("should record an audit log of a feedback update", async () => {
      const targetRecordId = crypto.randomUUID();
      const details = {
        changes: {
          after: { status: "resolved" },
          before: { status: "pending" },
        },
        entityName: "検索結果を配信日で絞り込みたいです",
      };
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/rpc/insert_audit_log",
        {
          body: JSON.stringify({
            p_action: "FEATURE_REQUEST_UPDATE",
            p_details: details,
            p_target_record_id: targetRecordId,
            p_target_table: "feature_requests",
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      expect(response.status).toBe(204);

      // Logs recorded within the same second have the same `created_at`,
      // so the log is looked up by its record instead of as the latest one.
      await expect(getAuditLogs({})).resolves.toContainEqual(
        expect.objectContaining({
          action: "FEATURE_REQUEST_UPDATE",
          details,
          target_record_id: targetRecordId,
          target_table: "feature_requests",
          user_email: "admin@example.com",
        })
      );
    });

    it("should record several audit logs with one call", async () => {
      const targetRecordIds = [crypto.randomUUID(), crypto.randomUUID()];
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/rpc/insert_audit_logs",
        {
          body: JSON.stringify({
            p_entries: targetRecordIds.map((id, index) => ({
              action: "VIDEO_DELETE",
              details: { entityName: `動画${index + 1}` },
              target_record_id: id,
              target_table: "videos",
            })),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      expect(response.status).toBe(204);

      const recorded = await getAuditLogs({});

      for (const [index, id] of targetRecordIds.entries()) {
        expect(recorded).toContainEqual(
          expect.objectContaining({
            action: "VIDEO_DELETE",
            details: { entityName: `動画${index + 1}` },
            target_record_id: id,
            target_table: "videos",
            user_email: "admin@example.com",
          })
        );
      }
    });
  });

  describe("Query parameter parsing", () => {
    it("should handle limit parameter", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/videos?limit=1"
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveLength(1);
    });
  });

  describe("Single object responses", () => {
    const headers = { accept: "application/vnd.pgrst.object+json" };

    it("should return the only row as an object", async () => {
      const [video] = (await (
        await fetch("https://fake.supabase.test/rest/v1/videos?limit=1")
      ).json()) as [{ id: string; title: string }];
      const response = await fetch(
        `https://fake.supabase.test/rest/v1/videos?select=id,title,talent:talents(name)&id=eq.${video.id}`,
        { headers }
      );
      const data = (await response.json()) as { talent?: unknown };

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/vnd.pgrst.object+json"
      );
      expect(Array.isArray(data)).toBe(false);
      expect(data).toMatchObject({ id: video.id, title: video.title });
      expect(data.talent).toHaveProperty("name");
    });

    it("should accept the media type with nulls stripped", async () => {
      const [talent] = (await (
        await fetch("https://fake.supabase.test/rest/v1/talents?limit=1")
      ).json()) as [{ id: string; name: string }];
      const response = await fetch(
        `https://fake.supabase.test/rest/v1/talents?select=id,name&id=eq.${talent.id}`,
        {
          headers: {
            accept: "application/vnd.pgrst.object+json;nulls=stripped",
          },
        }
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        id: talent.id,
        name: talent.name,
      });
    });

    it("should return PGRST116 when no row matches", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/videos?select=*&id=eq.00000000-0000-0000-0000-000000000000",
        { headers }
      );

      expect(response.status).toBe(406);
      await expect(response.json()).resolves.toMatchObject({
        code: "PGRST116",
        details: "The result contains 0 rows",
      });
    });

    it("should return PGRST116 when several rows match", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/talents?select=*",
        { headers }
      );
      const data = (await response.json()) as {
        code: string;
        details: string;
      };

      expect(response.status).toBe(406);
      expect(data.code).toBe("PGRST116");
      expect(data.details).toMatch(/^The result contains \d+ rows$/);
    });

    it("should return the updated row as an object", async () => {
      const [talent] = (await (
        await fetch("https://fake.supabase.test/rest/v1/talents?limit=1")
      ).json()) as [{ id: string; name: string }];
      const response = await fetch(
        `https://fake.supabase.test/rest/v1/talents?id=eq.${talent.id}`,
        {
          body: JSON.stringify({ name: talent.name }),
          headers: { ...headers, prefer: "return=representation" },
          method: "PATCH",
        }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({ id: talent.id, name: talent.name });
    });

    it("should keep returning arrays without the media type", async () => {
      const response = await fetch(
        "https://fake.supabase.test/rest/v1/videos?limit=1"
      );

      expect(Array.isArray(await response.json())).toBe(true);
    });
  });

  describe("Storage endpoints", () => {
    describe("createSignedUrl", () => {
      it("should return a signed URL for thumbnail", async () => {
        const response = await fetch(
          "https://fake.supabase.test/storage/v1/object/sign/thumbnails/test.jpg",
          {
            method: "POST",
          }
        );
        const data = (await response.json()) as { signedURL: string };

        expect(response.ok).toBe(true);
        expect(data).toHaveProperty("signedURL");
        expect(data.signedURL).toContain(
          "https://fake.supabase.test/storage/v1/object/public/thumbnails/test.jpg"
        );
      });

      it("should handle nested paths in createSignedUrl", async () => {
        const response = await fetch(
          "https://fake.supabase.test/storage/v1/object/sign/thumbnails/subfolder/test.jpg",
          {
            method: "POST",
          }
        );
        const data = (await response.json()) as { signedURL: string };

        expect(response.ok).toBe(true);
        expect(data).toHaveProperty("signedURL");
        expect(data.signedURL).toContain(
          "https://fake.supabase.test/storage/v1/object/public/thumbnails/subfolder/test.jpg"
        );
      });
    });

    describe("GET thumbnail image", () => {
      it("should return a dummy image for simple path", async () => {
        const response = await fetch(
          "https://fake.supabase.test/storage/v1/object/public/thumbnails/test.jpg"
        );

        expect(response.ok).toBe(true);
        expect(response.headers.get("content-type")).toBe("image/svg+xml");
        const text = await response.text();
        expect(text).toContain("<svg");
      });

      it("should return a dummy image for nested path", async () => {
        const response = await fetch(
          "https://fake.supabase.test/storage/v1/object/public/thumbnails/subfolder/test.jpg"
        );

        expect(response.ok).toBe(true);
        expect(response.headers.get("content-type")).toBe("image/svg+xml");
        const text = await response.text();
        expect(text).toContain("<svg");
      });

      it("should handle thumbnails/thumbnails/ double prefix path", async () => {
        // This simulates the case where the path in the database already includes "thumbnails/"
        const response = await fetch(
          "https://fake.supabase.test/storage/v1/object/public/thumbnails/thumbnails/uuid-123.jpg"
        );

        expect(response.ok).toBe(true);
        expect(response.headers.get("content-type")).toBe("image/svg+xml");
        const text = await response.text();
        expect(text).toContain("<svg");
      });
    });
  });
});
