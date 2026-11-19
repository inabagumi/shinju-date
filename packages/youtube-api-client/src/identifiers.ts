/**
 * Parsed YouTube channel identifier from user input (ID, handle, or URL).
 */
export type YouTubeChannelIdentifier =
  | { kind: "id"; id: string }
  | { kind: "handle"; handle: string };

/** YouTube channel ID: UC + 22 characters (24 total). */
const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[\w-]{22}$/u;

/** YouTube handle body (without @): 3–30 chars of letters, digits, underscore, hyphen, period. */
const YOUTUBE_HANDLE_PATTERN = /^[\w.-]{3,30}$/u;

/**
 * Returns the input as a URL string: as it is when it has a scheme, with
 * `https://` when it starts with the host of YouTube, and otherwise `null`.
 *
 * @param input - The trimmed user input
 * @returns The URL string, or `null` if the input is not a URL of YouTube
 */
const toUrlString = (input: string): string | null => {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }

  return /^(?:www\.)?(?:m\.)?youtube\.com\//iu.test(input)
    ? `https://${input}`
    : null;
};

/**
 * Parses the path of a channel URL of YouTube. `decodeURIComponent` throws
 * for a malformed escape sequence.
 *
 * @param pathname - The path of the URL
 * @returns Parsed identifier, or `null` if the path is not of a channel
 */
const parseChannelPath = (
  pathname: string
): YouTubeChannelIdentifier | null => {
  const channelMatch = pathname.match(
    /^\/channel\/(?<id>UC[\w-]{22})(?:\/|$)/iu
  );
  if (channelMatch?.groups?.["id"]) {
    return { id: channelMatch.groups["id"], kind: "id" };
  }

  const handleMatch = pathname.match(/^\/@(?<handle>[\w.-]+)(?:\/|$)/u);
  if (handleMatch?.groups?.["handle"]) {
    return { handle: handleMatch.groups["handle"], kind: "handle" };
  }

  const customMatch = pathname.match(/^\/c\/(?<name>[^/?#]+)(?:\/|$)/u);
  if (customMatch?.groups?.["name"]) {
    return {
      handle: decodeURIComponent(customMatch.groups["name"]),
      kind: "handle",
    };
  }

  const userMatch = pathname.match(/^\/user\/(?<name>[^/?#]+)(?:\/|$)/u);
  if (userMatch?.groups?.["name"]) {
    return {
      handle: decodeURIComponent(userMatch.groups["name"]),
      kind: "handle",
    };
  }

  return null;
};

/**
 * Parses free-form user input into a YouTube channel ID or handle.
 *
 * Supported forms:
 * - Channel ID: `UCxxxxxxxxxxxxxxxxxxxxxx`
 * - Handle: `@name` or `name`
 * - Channel URL: `https://www.youtube.com/channel/UCxxx...`
 * - Handle URL: `https://www.youtube.com/@name`
 * - Legacy custom URL: `https://www.youtube.com/c/Name` (looked up as handle)
 * - Legacy user URL: `https://www.youtube.com/user/Name` (looked up as handle)
 *
 * @returns Parsed identifier, or `null` if the input cannot be interpreted
 */
export const parseYouTubeChannelIdentifier = (
  raw: string
): YouTubeChannelIdentifier | null => {
  const input = raw.trim();
  if (!input) {
    return null;
  }

  const asUrl = toUrlString(input);

  if (asUrl) {
    try {
      const url = new URL(asUrl);
      const host = url.hostname.replace(/^www\./u, "").toLowerCase();

      if (
        host === "youtube.com" ||
        host === "m.youtube.com" ||
        host === "music.youtube.com"
      ) {
        const identifier = parseChannelPath(url.pathname);

        if (identifier) {
          return identifier;
        }
      }
    } catch {
      // Not a valid URL; fall through to bare ID / handle parsing.
    }
  }

  if (YOUTUBE_CHANNEL_ID_PATTERN.test(input)) {
    return { id: input, kind: "id" };
  }

  const handle = input.startsWith("@") ? input.slice(1) : input;
  if (YOUTUBE_HANDLE_PATTERN.test(handle)) {
    return { handle, kind: "handle" };
  }

  return null;
};
