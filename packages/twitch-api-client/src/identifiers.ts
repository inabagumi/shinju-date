/**
 * Parsed Twitch user identifier from user input (login or numeric user ID).
 */
export type TwitchUserIdentifier =
  | { kind: "id"; id: string }
  | { kind: "login"; login: string };

/** Numeric Twitch user ID (digits only). */
const TWITCH_USER_ID_PATTERN = /^\d+$/;

/** Twitch login name: 4–25 chars of letters, digits, underscore. */
const TWITCH_LOGIN_PATTERN = /^[a-zA-Z0-9_]{4,25}$/;

/**
 * Parses free-form user input into a Twitch user ID or login name.
 *
 * Supported forms:
 * - Login: `name` or `Name` (case-insensitive; stored lowercased)
 * - User ID: numeric string
 * - Channel URL: `https://www.twitch.tv/name`
 * - About URL: `https://www.twitch.tv/name/about`
 *
 * @returns Parsed identifier, or `null` if the input cannot be interpreted
 */
export function parseTwitchUserIdentifier(
  raw: string
): TwitchUserIdentifier | null {
  const input = raw.trim();
  if (!input) {
    return null;
  }

  const asUrl =
    input.startsWith("http://") || input.startsWith("https://")
      ? input
      : /^(?:www\.)?twitch\.tv\//i.test(input)
        ? `https://${input}`
        : null;

  if (asUrl) {
    try {
      const url = new URL(asUrl);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();

      if (host === "twitch.tv" || host === "m.twitch.tv") {
        const pathMatch = url.pathname.match(
          /^\/([a-zA-Z0-9_]{4,25})(?:\/|$)/i
        );
        if (pathMatch?.[1]) {
          const segment = pathMatch[1].toLowerCase();
          if (
            ![
              "directory",
              "downloads",
              "jobs",
              "p",
              "settings",
              "store",
              "turbo",
              "videos",
            ].includes(segment)
          ) {
            return { kind: "login", login: segment };
          }
        }
      }
    } catch {
      // Not a valid URL; fall through.
    }
  }

  if (TWITCH_USER_ID_PATTERN.test(input)) {
    return { id: input, kind: "id" };
  }

  const login = input.startsWith("@") ? input.slice(1) : input;
  if (TWITCH_LOGIN_PATTERN.test(login)) {
    return { kind: "login", login: login.toLowerCase() };
  }

  return null;
}
