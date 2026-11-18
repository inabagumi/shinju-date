import { youtube_v3 as youtube } from "@googleapis/youtube";

export interface ClientOptions {
  /** YouTube client to use. Defaults to the shared singleton. */
  client?: youtube.Youtube | undefined;
}

function createYouTubeClient(): youtube.Youtube {
  const apiKey = process.env["GOOGLE_API_KEY"];

  if (!apiKey) {
    throw new TypeError("An API Key is required.");
  }

  return new youtube.Youtube({
    auth: apiKey,
    fetchImplementation: fetch,
  });
}

let _youtubeClient: youtube.Youtube | null = null;

/**
 * Gets or creates a singleton YouTube client instance
 */
export function getYouTubeClient(): youtube.Youtube {
  if (!_youtubeClient) {
    _youtubeClient = createYouTubeClient();
  }
  return _youtubeClient;
}
