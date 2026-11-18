import { describe, expect, test } from "vitest";

import type {
  ProfileImage,
  TalentTwitchUser,
  TalentYouTubeChannel,
} from "@/lib/data/talents";

import { getTalentProfileImage } from "./talent-profile-image";

function createProfileImage(id: string): ProfileImage {
  return { blur_data_url: "data:image/png;base64,AAAA", id };
}

function createYouTubeChannel(
  profileImage: ProfileImage | null
): TalentYouTubeChannel {
  return {
    name: "YouTube",
    profile_image: profileImage,
    youtube_channel_id: "UC1",
    youtube_handle: "@youtube",
  };
}

function createTwitchUser(profileImage: ProfileImage | null): TalentTwitchUser {
  return {
    name: "Twitch",
    profile_image: profileImage,
    twitch_login_name: "twitch",
    twitch_user_id: "1",
  };
}

describe("getTalentProfileImage", () => {
  test("should prefer the icon of a YouTube channel", () => {
    expect(
      getTalentProfileImage({
        twitch_users: [createTwitchUser(createProfileImage("twitch"))],
        youtube_channels: [createYouTubeChannel(createProfileImage("youtube"))],
      })
    ).toEqual(createProfileImage("youtube"));
  });

  test("should use the first channel that has an icon", () => {
    expect(
      getTalentProfileImage({
        twitch_users: [],
        youtube_channels: [
          createYouTubeChannel(null),
          createYouTubeChannel(createProfileImage("second")),
        ],
      })
    ).toEqual(createProfileImage("second"));
  });

  test("should fall back to the icon of a Twitch user", () => {
    expect(
      getTalentProfileImage({
        twitch_users: [createTwitchUser(createProfileImage("twitch"))],
        youtube_channels: [createYouTubeChannel(null)],
      })
    ).toEqual(createProfileImage("twitch"));
  });

  test("should return null without any icon", () => {
    expect(
      getTalentProfileImage({
        twitch_users: [createTwitchUser(null)],
        youtube_channels: [],
      })
    ).toBeNull();
  });
});
