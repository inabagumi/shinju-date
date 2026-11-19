import type { Tables } from "@shinju-date/database";

import { getTwitchUserIconName, getTwitchUserIconUrl } from "../twitch-urls.js";
import {
  getYouTubeChannelIconName,
  getYouTubeChannelIconUrl,
} from "../youtube-urls.js";
import { randomBlurDataUrl, randomPast } from "./context.js";
import type { SeedContext } from "./context.js";

/**
 * IDs of the seeded active talents, in the order of their readings
 * (あさぎりみお, かざはなりつ, しらつゆねね, なぎさわゆら).
 *
 * - The first one has a YouTube channel and a Twitch user, both with icons
 * - The second one has a YouTube channel with an icon and a Twitch user
 *   without one
 * - The last one has only a YouTube channel without an icon
 *
 * The first one also has finished streams within 90 days, mostly on Saturday
 * at 21:00 in Japan, for the tendency of its streams on its page.
 */
export const MOCK_TALENT_IDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
] as const;

/** ID of the seeded talent whose status is `retired` */
export const MOCK_RETIRED_TALENT_ID = "00000000-0000-4000-8000-000000000005";

/** ID of the seeded talent that is deleted (`deleted_at` is set) */
export const MOCK_DELETED_TALENT_ID = "00000000-0000-4000-8000-000000000006";

/** ID of the seeded active talent that has no channels or videos */
export const MOCK_TALENT_WITHOUT_VIDEOS_ID =
  "00000000-0000-4000-8000-000000000007";

/**
 * The size of the YouTube icons that the batch app stores: the smallest
 * square one of at least 256 pixels that the YouTube Data API offers.
 */
const STORED_YOUTUBE_ICON_SIZE = 800;

const TALENTS_WITH_VIDEOS = [
  { name: "朝霧ミオ", reading: "あさぎりみお", themeColor: "#FF6B9D" },
  { name: "風花リツ", reading: "かざはなりつ", themeColor: "#87CEEB" },
  { name: "白露ネネ", reading: "しらつゆねね", themeColor: "#98D8C8" },
  { name: "凪沢ユラ", reading: "なぎさわゆら", themeColor: "#FFB6C1" },
] as const;

export interface SeedAccounts {
  profileImages: Tables<"profile_images">[];
  /** Every talent */
  talents: Tables<"talents">[];
  /** The active talents of `MOCK_TALENT_IDS`, which have channels and videos */
  talentsWithVideos: Tables<"talents">[];
  twitchUsers: Tables<"twitch_users">[];
  youtubeChannels: Tables<"youtube_channels">[];
}

const createTalent = (
  context: SeedContext,
  values: Pick<Tables<"talents">, "id" | "name"> & Partial<Tables<"talents">>
): Tables<"talents"> => {
  const createdAt = values.created_at ?? randomPast(context, 365 * 2);

  return {
    created_at: createdAt,
    deleted_at: null,
    reading: null,
    status: "active",
    theme_color: null,
    updated_at: values.deleted_at ?? createdAt,
    ...values,
  };
};

/**
 * Talents and their accounts: the talents of `MOCK_TALENT_IDS` with YouTube
 * channels (all but the last with icons) and Twitch users (for the first two,
 * only the first with an icon), and a talent without videos, a retired one
 * and a deleted one, which have no accounts.
 */
export const createAccounts = (context: SeedContext): SeedAccounts => {
  const { faker } = context;
  const talentsWithVideos = TALENTS_WITH_VIDEOS.map(
    ({ name, reading, themeColor }, index) =>
      createTalent(context, {
        // Fixed so that E2E tests can open the page of a talent
        id: MOCK_TALENT_IDS[index] ?? faker.string.uuid(),
        name,
        reading,
        theme_color: themeColor,
      })
  );
  // They have no readings, so the new talent comes last on the list of
  // talents.
  const otherTalents = [
    createTalent(context, {
      created_at: randomPast(context, 7),
      id: MOCK_TALENT_WITHOUT_VIDEOS_ID,
      name: "動画のないタレント",
    }),
    createTalent(context, {
      created_at: randomPast(context, 365 * 3),
      id: MOCK_RETIRED_TALENT_ID,
      name: "引退したタレント",
      status: "retired",
    }),
    createTalent(context, {
      created_at: randomPast(context, 365 * 3),
      deleted_at: randomPast(context, 30),
      id: MOCK_DELETED_TALENT_ID,
      name: "削除したタレント",
    }),
  ];

  const profileImages: Tables<"profile_images">[] = [];
  const createProfileImage = (
    values: Pick<Tables<"profile_images">, "etag" | "path" | "source_url">
  ) => {
    const createdAt = randomPast(context, 365);
    const profileImage: Tables<"profile_images"> = {
      blur_data_url: randomBlurDataUrl(context),
      created_at: createdAt,
      height: 256,
      id: faker.string.uuid(),
      updated_at: createdAt,
      width: 256,
      ...values,
    };

    profileImages.push(profileImage);

    return profileImage;
  };

  const youtubeChannels = talentsWithVideos.map(
    (talent, index): Tables<"youtube_channels"> => {
      const youtubeChannelId = `UC${faker.string.alphanumeric(22)}`;
      // Saved like the batch app saves the icon that the YouTube mock serves
      const profileImage =
        index < talentsWithVideos.length - 1
          ? createProfileImage({
              etag: `"${getYouTubeChannelIconName(youtubeChannelId, STORED_YOUTUBE_ICON_SIZE)}"`,
              path: `youtube/${youtubeChannelId}/${faker.string.alphanumeric(21)}.webp`,
              source_url: getYouTubeChannelIconUrl(
                youtubeChannelId,
                STORED_YOUTUBE_ICON_SIZE
              ),
            })
          : null;

      return {
        id: faker.string.uuid(),
        name: talent.name,
        profile_image_id: profileImage?.id ?? null,
        talent_id: talent.id,
        youtube_channel_id: youtubeChannelId,
        // Handles are lowercase like the `customUrl` of the YouTube Data API
        youtube_handle: `@${faker.internet.username().toLowerCase()}`,
      };
    }
  );

  const twitchUsers = talentsWithVideos
    .slice(0, 2)
    .map((talent, index): Tables<"twitch_users"> => {
      const twitchUserId = faker.string.numeric(9);
      // Saved like the batch app saves the icon that the Twitch mock serves
      const profileImage =
        index === 0
          ? createProfileImage({
              etag: `"${getTwitchUserIconName(twitchUserId)}"`,
              path: `twitch/${twitchUserId}/${faker.string.alphanumeric(21)}.webp`,
              source_url: getTwitchUserIconUrl(twitchUserId),
            })
          : null;

      return {
        id: faker.string.uuid(),
        name: talent.name,
        profile_image_id: profileImage?.id ?? null,
        talent_id: talent.id,
        twitch_login_name: faker.internet.username().toLowerCase(),
        twitch_user_id: twitchUserId,
      };
    });

  return {
    profileImages,
    talents: [...talentsWithVideos, ...otherTalents],
    talentsWithVideos,
    twitchUsers,
    youtubeChannels,
  };
};
