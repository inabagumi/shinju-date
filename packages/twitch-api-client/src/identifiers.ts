/**
 * Parsed Twitch user identifier from user input (login or numeric user ID).
 */
export type TwitchUserIdentifier =
  | { kind: "id"; id: string }
  | { kind: "login"; login: string };

/** Numeric Twitch user ID (digits only). */
const TWITCH_USER_ID_PATTERN = /^\d+$/u;

/** Twitch login name: 4–25 chars of letters, digits, underscore. */
const TWITCH_LOGIN_PATTERN = /^[a-zA-Z0-9_]{4,25}$/u;

/**
 * Returns the input as a URL string: as it is when it has a scheme, with
 * `https://` when it starts with the host of Twitch, and otherwise `null`.
 *
 * @param input - The trimmed user input
 * @returns The URL string, or `null` if the input is not a URL of Twitch
 */
const toUrlString = (input: string): string | null => {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }

  return /^(?:www\.)?twitch\.tv\//iu.test(input) ? `https://${input}` : null;
};

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
export const parseTwitchUserIdentifier = (
  raw: string
): TwitchUserIdentifier | null => {
  const input = raw.trim();
  if (!input) {
    return null;
  }

  const asUrl = toUrlString(input);

  if (asUrl) {
    try {
      const url = new URL(asUrl);
      const host = url.hostname.replace(/^www\./u, "").toLowerCase();

      if (host === "twitch.tv" || host === "m.twitch.tv") {
        const pathMatch = url.pathname.match(
          /^\/(?<segment>[a-zA-Z0-9_]{4,25})(?:\/|$)/iu
        );
        if (pathMatch?.groups?.["segment"]) {
          const segment = pathMatch.groups["segment"].toLowerCase();
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
};
