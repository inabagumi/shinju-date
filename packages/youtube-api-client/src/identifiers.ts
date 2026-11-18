/**
 * Parsed YouTube channel identifier from user input (ID, handle, or URL).
 */
export type YouTubeChannelIdentifier =
  | { kind: "id"; id: string }
  | { kind: "handle"; handle: string };

/** YouTube channel ID: UC + 22 characters (24 total). */
const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[\w-]{22}$/;

/** YouTube handle body (without @): 3–30 chars of letters, digits, underscore, hyphen, period. */
const YOUTUBE_HANDLE_PATTERN = /^[\w.-]{3,30}$/;

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
export function parseYouTubeChannelIdentifier(
  raw: string
): YouTubeChannelIdentifier | null {
  const input = raw.trim();
  if (!input) {
    return null;
  }

  const asUrl =
    input.startsWith("http://") || input.startsWith("https://")
      ? input
      : /^(?:www\.)?(?:m\.)?youtube\.com\//i.test(input)
        ? `https://${input}`
        : null;

  if (asUrl) {
    try {
      const url = new URL(asUrl);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();

      if (
        host === "youtube.com" ||
        host === "m.youtube.com" ||
        host === "music.youtube.com"
      ) {
        const channelMatch = url.pathname.match(
          /^\/channel\/(UC[\w-]{22})(?:\/|$)/i
        );
        if (channelMatch?.[1]) {
          return { id: channelMatch[1], kind: "id" };
        }

        const handleMatch = url.pathname.match(/^\/@([\w.-]+)(?:\/|$)/);
        if (handleMatch?.[1]) {
          return { handle: handleMatch[1], kind: "handle" };
        }

        const customMatch = url.pathname.match(/^\/c\/([^/?#]+)(?:\/|$)/);
        if (customMatch?.[1]) {
          return {
            handle: decodeURIComponent(customMatch[1]),
            kind: "handle",
          };
        }

        const userMatch = url.pathname.match(/^\/user\/([^/?#]+)(?:\/|$)/);
        if (userMatch?.[1]) {
          return {
            handle: decodeURIComponent(userMatch[1]),
            kind: "handle",
          };
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
}
