import { track as vercelTrack } from "@vercel/analytics/server";

import { getVideoUrl } from "@/lib/video-url";

import type { Video } from "./get-video-by-url";

// oxlint-disable-next-line typescript/consistent-type-definitions -- interface には暗黙のインデックスシグネチャがなく、vercelTrack の Record<string, AllowedPropertyValues> に渡せないため
type TrackProperties = {
  provider: "YouTube" | "Twitch";
  talent_id: string;
  talent_name: string;
  title: string;
  url: string;
  video_id: string;
};

function generateTrackProperties(video: Video): TrackProperties {
  const url = getVideoUrl(video);

  if (!url) {
    throw new Error("Video must have a platform-specific identifier");
  }

  return {
    provider: video.platform === "twitch" ? "Twitch" : "YouTube",
    talent_id: video.talent.id,
    talent_name: video.talent.name,
    title: video.title,
    url,
    video_id: video.id,
  };
}

export default async function track(
  video: Video,
  {
    headers,
  }: {
    headers: Headers;
  }
): Promise<void> {
  const trackProperties = generateTrackProperties(video);

  await vercelTrack("Link click", trackProperties, {
    headers,
  });
}
