import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createProfileImage,
  createTalent,
  createTwitchUser,
  createYouTubeChannel,
} from "@/test/factories";
import {
  failSupabase,
  seedSupabase,
  setupSupabase,
  supabaseRequests,
} from "@/test/supabase";

import { fetchActiveTalents, fetchTalent, fetchTalentList } from "./talents";

// Vitest does not run `'use cache'`, so only what the fetchers pass to the
// cache is checked
vi.mock(import("next/cache"), () => ({
  // A name of a profile or an object, which every overload of cacheLife takes
  cacheLife: vi.fn<(profile: string | object) => void>(),
  cacheTag: vi.fn<typeof cacheTag>(),
}));

setupSupabase();

const talent = createTalent({ name: "朝霧ミオ" });
const otherTalent = createTalent({ name: "風花リツ" });
const otherChannel = createYouTubeChannel({ talent_id: otherTalent.id });
const twitchUser = createTwitchUser({
  talent_id: otherTalent.id,
  twitch_login_name: "ritsu",
});

const withProfileImage = ({
  blur_data_url,
  id,
}: {
  blur_data_url: string;
  id: string;
}) => ({ profile_image: { blur_data_url, id } });

describe("lib/data/talents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe(fetchActiveTalents, () => {
    it("returns the active talents that are not deleted, by name", async () => {
      const yuki = createTalent({ name: "ゆき" });
      const aoi = createTalent({ name: "あおい" });

      await seedSupabase({
        talents: [
          yuki,
          createTalent({ name: "いずみ", status: "retired" }),
          createTalent({ deleted_at: "2026-11-01T00:00:00Z", name: "うみ" }),
          aoi,
        ],
      });

      await expect(fetchActiveTalents()).resolves.toStrictEqual([
        { id: aoi.id, name: "あおい" },
        { id: yuki.id, name: "ゆき" },
      ]);
      expect(cacheTag).toHaveBeenCalledWith("talents");
    });

    it("throws when the talents cannot be fetched", async () => {
      failSupabase("talents", "failed");

      await expect(fetchActiveTalents()).rejects.toThrow("failed");
    });
  });

  describe(fetchTalent, () => {
    it("returns the talent with its accounts, sorted by their platform IDs", async () => {
      const icon = createProfileImage();
      const subChannel = createYouTubeChannel({
        name: "Sub",
        talent_id: talent.id,
        youtube_channel_id: "UCb",
      });
      const mainChannel = createYouTubeChannel({
        name: "Main",
        profile_image_id: icon.id,
        talent_id: talent.id,
        youtube_channel_id: "UCa",
        youtube_handle: "@main",
      });
      const userB = createTwitchUser({
        name: "B",
        talent_id: talent.id,
        twitch_login_name: "b",
        twitch_user_id: "200",
      });
      const userA = createTwitchUser({
        name: "A",
        talent_id: talent.id,
        twitch_login_name: "a",
        twitch_user_id: "100",
      });

      await seedSupabase({
        profileImages: [icon],
        talents: [{ ...talent, theme_color: "#FF6B9D" }, otherTalent],
        twitchUsers: [userB, userA, twitchUser],
        youtubeChannels: [subChannel, mainChannel, otherChannel],
      });

      await expect(fetchTalent(talent.id)).resolves.toStrictEqual({
        id: talent.id,
        name: "朝霧ミオ",
        theme_color: "#FF6B9D",
        twitch_users: [
          {
            name: "A",
            profile_image: null,
            twitch_login_name: "a",
            twitch_user_id: "100",
          },
          {
            name: "B",
            profile_image: null,
            twitch_login_name: "b",
            twitch_user_id: "200",
          },
        ],
        youtube_channels: [
          {
            name: "Main",
            profile_image: { blur_data_url: icon.blur_data_url, id: icon.id },
            youtube_channel_id: "UCa",
            youtube_handle: "@main",
          },
          {
            name: "Sub",
            profile_image: null,
            youtube_channel_id: "UCb",
            youtube_handle: null,
          },
        ],
      });
    });

    it("is cached for days with the talents tag", async () => {
      await fetchTalent(talent.id);

      expect(cacheLife).toHaveBeenCalledWith("days");
      expect(cacheTag).toHaveBeenCalledWith("talents");
    });

    it.each([
      ["retired", { status: "retired" }],
      ["deleted", { deleted_at: "2026-11-01T00:00:00Z" }],
    ] as const)(
      "returns null for a talent that is %s",
      async (_, overrides) => {
        await seedSupabase({ talents: [{ ...talent, ...overrides }] });

        await expect(fetchTalent(talent.id)).resolves.toBeNull();
      }
    );

    it("returns null for a talent that does not exist", async () => {
      await seedSupabase({ talents: [otherTalent] });

      await expect(fetchTalent(talent.id)).resolves.toBeNull();
    });

    it("returns null for an ID that is not a UUID without querying", async () => {
      await expect(fetchTalent("not-a-uuid")).resolves.toBeNull();
      expect(supabaseRequests()).toStrictEqual([]);
    });

    it("throws when the talent cannot be fetched", async () => {
      failSupabase("talents", "connection refused");

      await expect(fetchTalent(talent.id)).rejects.toThrow(
        "connection refused"
      );
    });
  });

  describe(fetchTalentList, () => {
    it("returns the active talents by reading, and the ones without one by name last", async () => {
      const ka = createTalent({ name: "B", reading: "か" });
      const a = createTalent({ name: "A", reading: "あ" });
      const z = createTalent({ name: "Z", reading: null });
      const y = createTalent({ name: "Y", reading: null });

      await seedSupabase({
        talents: [
          z,
          ka,
          createTalent({ name: "R", reading: "い", status: "retired" }),
          createTalent({ deleted_at: "2026-11-01T00:00:00Z", name: "D" }),
          y,
          a,
        ],
      });

      const talents = await fetchTalentList();

      expect(talents.map((item) => item.name)).toStrictEqual([
        "A",
        "B",
        "Y",
        "Z",
      ]);
      expect(talents[0]).toStrictEqual({
        id: a.id,
        name: "A",
        twitch_users: [],
        youtube_channels: [],
      });
    });

    it("returns only the icons, in the same order as fetchTalent", async () => {
      const youtubeIcon = createProfileImage();
      const twitchIconA = createProfileImage();
      const twitchIconB = createProfileImage();

      await seedSupabase({
        profileImages: [youtubeIcon, twitchIconA, twitchIconB],
        talents: [talent],
        twitchUsers: [
          createTwitchUser({
            profile_image_id: twitchIconB.id,
            talent_id: talent.id,
            twitch_user_id: "200",
          }),
          createTwitchUser({
            profile_image_id: twitchIconA.id,
            talent_id: talent.id,
            twitch_user_id: "100",
          }),
        ],
        youtubeChannels: [
          createYouTubeChannel({
            profile_image_id: youtubeIcon.id,
            talent_id: talent.id,
            youtube_channel_id: "UCb",
          }),
          createYouTubeChannel({
            talent_id: talent.id,
            youtube_channel_id: "UCa",
          }),
        ],
      });

      await expect(fetchTalentList()).resolves.toStrictEqual([
        {
          id: talent.id,
          name: "朝霧ミオ",
          twitch_users: [
            withProfileImage(twitchIconA),
            withProfileImage(twitchIconB),
          ],
          youtube_channels: [
            { profile_image: null },
            withProfileImage(youtubeIcon),
          ],
        },
      ]);
    });

    it("is cached for days with the talents tag", async () => {
      await fetchTalentList();

      expect(cacheLife).toHaveBeenCalledWith("days");
      expect(cacheTag).toHaveBeenCalledWith("talents");
    });

    it("throws when the talents cannot be fetched", async () => {
      failSupabase("talents", "failed");

      await expect(fetchTalentList()).rejects.toThrow("failed");
    });
  });
});
