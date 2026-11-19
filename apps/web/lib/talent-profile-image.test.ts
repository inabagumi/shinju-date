import { describe, expect, it } from "vitest";

import type {
  ProfileImage,
  TalentTwitchUser,
  TalentYouTubeChannel,
} from "@/lib/data/talents";

import { getTalentProfileImage } from "./talent-profile-image";

const createProfileImage = (id: string): ProfileImage => ({
  blur_data_url: "data:image/png;base64,AAAA",
  id,
});

const createYouTubeChannel = (
  profileImage: ProfileImage | null
): TalentYouTubeChannel => ({
  name: "YouTube",
  profile_image: profileImage,
  youtube_channel_id: "UC1",
  youtube_handle: "@youtube",
});

const createTwitchUser = (
  profileImage: ProfileImage | null
): TalentTwitchUser => ({
  name: "Twitch",
  profile_image: profileImage,
  twitch_login_name: "twitch",
  twitch_user_id: "1",
});

describe(getTalentProfileImage, () => {
  it("should prefer the icon of a YouTube channel", () => {
    expect(
      getTalentProfileImage({
        twitch_users: [createTwitchUser(createProfileImage("twitch"))],
        youtube_channels: [createYouTubeChannel(createProfileImage("youtube"))],
      })
    ).toStrictEqual(createProfileImage("youtube"));
  });

  it("should use the first channel that has an icon", () => {
    expect(
      getTalentProfileImage({
        twitch_users: [],
        youtube_channels: [
          createYouTubeChannel(null),
          createYouTubeChannel(createProfileImage("second")),
        ],
      })
    ).toStrictEqual(createProfileImage("second"));
  });

  it("should fall back to the icon of a Twitch user", () => {
    expect(
      getTalentProfileImage({
        twitch_users: [createTwitchUser(createProfileImage("twitch"))],
        youtube_channels: [createYouTubeChannel(null)],
      })
    ).toStrictEqual(createProfileImage("twitch"));
  });

  it("should return null without any icon", () => {
    expect(
      getTalentProfileImage({
        twitch_users: [createTwitchUser(null)],
        youtube_channels: [],
      })
    ).toBeNull();
  });
});
