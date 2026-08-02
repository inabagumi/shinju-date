import { z } from 'zod'

const TWITCH_ID_API_BASE = 'https://id.twitch.tv'
const TWITCH_HELIX_API_BASE = 'https://api.twitch.tv/helix'
export const TWITCH_API_MAX_RESULTS = 100

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const TwitchUserSchema = z.object({
  broadcaster_type: z.string(),
  created_at: z.string(),
  description: z.string(),
  display_name: z.string(),
  id: z.string(),
  login: z.string(),
  offline_image_url: z.string(),
  profile_image_url: z.string(),
  type: z.string(),
  view_count: z.number().optional(),
})

export const TwitchVideoSchema = z.object({
  created_at: z.string(),
  description: z.string(),
  duration: z.string(),
  id: z.string(),
  language: z.string(),
  muted_segments: z
    .array(
      z.object({
        duration: z.number(),
        offset: z.number(),
      }),
    )
    .nullable()
    .optional(),
  published_at: z.string(),
  stream_id: z.string().nullable().optional(),
  thumbnail_url: z.string(),
  title: z.string(),
  type: z.enum(['archive', 'highlight', 'upload']),
  url: z.string(),
  user_id: z.string(),
  user_login: z.string(),
  user_name: z.string(),
  view_count: z.number(),
  viewable: z.string(),
})

export const TwitchClipSchema = z.object({
  broadcaster_id: z.string(),
  broadcaster_name: z.string(),
  created_at: z.string(),
  creator_id: z.string(),
  creator_name: z.string(),
  duration: z.number(),
  embed_url: z.string(),
  game_id: z.string(),
  id: z.string(),
  language: z.string(),
  thumbnail_url: z.string(),
  title: z.string(),
  url: z.string(),
  video_id: z.string(),
  view_count: z.number(),
  vod_offset: z.number().nullable().optional(),
})

export type TwitchUser = z.infer<typeof TwitchUserSchema>
export type TwitchVideo = z.infer<typeof TwitchVideoSchema>
export type TwitchClip = z.infer<typeof TwitchClipSchema>

// ---------------------------------------------------------------------------
// Credentials / App Access Token
// ---------------------------------------------------------------------------

export interface TwitchCredentials {
  clientId: string
  clientSecret: string
}

interface CachedToken {
  accessToken: string
  expiresAtMs: number
}

let _credentials: TwitchCredentials | null = null
let _tokenCache: CachedToken | null = null

/**
 * Reads Twitch app credentials from environment variables.
 */
export function getTwitchCredentials(): TwitchCredentials {
  if (_credentials) {
    return _credentials
  }

  const clientId = process.env['TWITCH_CLIENT_ID']
  const clientSecret = process.env['TWITCH_CLIENT_SECRET']

  if (!clientId || !clientSecret) {
    throw new TypeError(
      'Twitch Client ID and Client Secret are required (TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET).',
    )
  }

  _credentials = { clientId, clientSecret }
  return _credentials
}

/**
 * Resets cached credentials and token (for tests).
 */
export function resetTwitchClientState(): void {
  _credentials = null
  _tokenCache = null
}

const TokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
})

/**
 * Returns a valid App Access Token, refreshing when needed.
 */
export async function getAppAccessToken(
  credentials: TwitchCredentials = getTwitchCredentials(),
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const now = Date.now()
  // Refresh 60s before expiry to avoid edge races
  if (_tokenCache && _tokenCache.expiresAtMs > now + 60_000) {
    return _tokenCache.accessToken
  }

  const url = new URL('/oauth2/token', TWITCH_ID_API_BASE)
  url.searchParams.set('client_id', credentials.clientId)
  url.searchParams.set('client_secret', credentials.clientSecret)
  url.searchParams.set('grant_type', 'client_credentials')

  const response = await fetchImpl(url, { method: 'POST' })

  if (!response.ok) {
    throw new Error(
      `Failed to obtain Twitch App Access Token: ${response.status} ${response.statusText}`,
    )
  }

  const json: unknown = await response.json()
  const token = TokenResponseSchema.parse(json)

  _tokenCache = {
    accessToken: token.access_token,
    expiresAtMs: now + token.expires_in * 1000,
  }

  return token.access_token
}

async function helixGet<T>(
  path: string,
  searchParams: URLSearchParams,
  schema: z.ZodType<T>,
  options?: {
    credentials?: TwitchCredentials
    fetchImpl?: typeof fetch
  },
): Promise<T[]> {
  const credentials = options?.credentials ?? getTwitchCredentials()
  const fetchImpl = options?.fetchImpl ?? fetch
  const accessToken = await getAppAccessToken(credentials, fetchImpl)

  // Do not use `new URL('/users', 'https://api.twitch.tv/helix')`:
  // an absolute path replaces the base path, yielding api.twitch.tv/users (404).
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${TWITCH_HELIX_API_BASE}${normalizedPath}`)
  for (const [key, value] of searchParams.entries()) {
    url.searchParams.append(key, value)
  }

  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': credentials.clientId,
    },
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(
      `Twitch Helix request failed (${path}): ${response.status} ${response.statusText}`,
    )
  }

  const json: unknown = await response.json()
  const parsed = z.object({ data: z.array(z.unknown()) }).parse(json)

  const items: T[] = []
  for (const item of parsed.data) {
    const result = schema.safeParse(item)
    if (result.success) {
      items.push(result.data)
    }
  }
  return items
}

// ---------------------------------------------------------------------------
// Identifier parsing
// ---------------------------------------------------------------------------

/**
 * Parsed Twitch user identifier from user input (login or numeric user ID).
 */
export type TwitchUserIdentifier =
  | { kind: 'id'; id: string }
  | { kind: 'login'; login: string }

/** Numeric Twitch user ID (digits only). */
const TWITCH_USER_ID_PATTERN = /^\d+$/

/** Twitch login name: 4–25 chars of letters, digits, underscore. */
const TWITCH_LOGIN_PATTERN = /^[a-zA-Z0-9_]{4,25}$/

/**
 * Parses free-form user input into a Twitch user ID or login name.
 *
 * Supported forms:
 * - Login: `name` or `Name` (case-insensitive; stored lowercased)
 * - User ID: numeric string
 * - Channel URL: `https://www.twitch.tv/name`
 * - About URL: `https://www.twitch.tv/name/about`
 * - Video URL with login is not used for user resolution
 *
 * @returns Parsed identifier, or `null` if the input cannot be interpreted
 */
export function parseTwitchUserIdentifier(
  raw: string,
): TwitchUserIdentifier | null {
  const input = raw.trim()
  if (!input) {
    return null
  }

  const asUrl =
    input.startsWith('http://') || input.startsWith('https://')
      ? input
      : /^(?:www\.)?twitch\.tv\//i.test(input)
        ? `https://${input}`
        : null

  if (asUrl) {
    try {
      const url = new URL(asUrl)
      const host = url.hostname.replace(/^www\./, '').toLowerCase()

      if (host === 'twitch.tv' || host === 'm.twitch.tv') {
        // /username or /username/...
        const pathMatch = url.pathname.match(/^\/([a-zA-Z0-9_]{4,25})(?:\/|$)/i)
        if (pathMatch?.[1]) {
          const segment = pathMatch[1].toLowerCase()
          // Skip reserved path segments that are not logins
          if (
            ![
              'directory',
              'downloads',
              'jobs',
              'p',
              'settings',
              'store',
              'turbo',
              'videos',
            ].includes(segment)
          ) {
            return { kind: 'login', login: segment }
          }
        }
      }
    } catch {
      // Not a valid URL; fall through.
    }
  }

  if (TWITCH_USER_ID_PATTERN.test(input)) {
    return { id: input, kind: 'id' }
  }

  const login = input.startsWith('@') ? input.slice(1) : input
  if (TWITCH_LOGIN_PATTERN.test(login)) {
    return { kind: 'login', login: login.toLowerCase() }
  }

  return null
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface GetUsersOptions {
  ids?: string[]
  logins?: string[]
}

/**
 * Gets Twitch users by ID and/or login (batched).
 */
export async function* getUsers({
  ids = [],
  logins = [],
}: GetUsersOptions): AsyncGenerator<TwitchUser, void, undefined> {
  if (ids.length === 0 && logins.length === 0) {
    return
  }

  // Helix allows mixing id and login params; max 100 total per request
  const idChunks: string[][] = []
  for (let i = 0; i < ids.length; i += TWITCH_API_MAX_RESULTS) {
    idChunks.push(ids.slice(i, i + TWITCH_API_MAX_RESULTS))
  }
  const loginChunks: string[][] = []
  for (let i = 0; i < logins.length; i += TWITCH_API_MAX_RESULTS) {
    loginChunks.push(logins.slice(i, i + TWITCH_API_MAX_RESULTS))
  }

  const maxChunks = Math.max(idChunks.length, loginChunks.length, 1)

  for (let i = 0; i < maxChunks; i++) {
    const params = new URLSearchParams()
    for (const id of idChunks[i] ?? []) {
      params.append('id', id)
    }
    for (const login of loginChunks[i] ?? []) {
      params.append('login', login)
    }
    if ([...params.keys()].length === 0) {
      continue
    }

    const users = await helixGet('/users', params, TwitchUserSchema)
    yield* users
  }
}

export async function getUserById(id: string): Promise<TwitchUser | null> {
  for await (const user of getUsers({ ids: [id] })) {
    return user
  }
  return null
}

export async function getUserByLogin(
  login: string,
): Promise<TwitchUser | null> {
  for await (const user of getUsers({ logins: [login.toLowerCase()] })) {
    return user
  }
  return null
}

/**
 * Resolves a parsed identifier to a Twitch user via the Helix API.
 */
export async function resolveTwitchUser(
  identifier: TwitchUserIdentifier,
): Promise<TwitchUser | null> {
  if (identifier.kind === 'id') {
    return getUserById(identifier.id)
  }
  return getUserByLogin(identifier.login)
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

export interface GetVideosOptions {
  ids: string[]
}

/**
 * Gets Twitch videos (VOD / highlight / upload) by ID.
 */
export async function* getVideos({
  ids,
}: GetVideosOptions): AsyncGenerator<TwitchVideo, void, undefined> {
  for (let i = 0; i < ids.length; i += TWITCH_API_MAX_RESULTS) {
    const params = new URLSearchParams()
    for (const id of ids.slice(i, i + TWITCH_API_MAX_RESULTS)) {
      params.append('id', id)
    }
    const videos = await helixGet('/videos', params, TwitchVideoSchema)
    yield* videos
  }
}

// ---------------------------------------------------------------------------
// Clips
// ---------------------------------------------------------------------------

export interface GetClipsOptions {
  ids: string[]
}

/**
 * Gets Twitch clips by ID (slug).
 */
export async function* getClips({
  ids,
}: GetClipsOptions): AsyncGenerator<TwitchClip, void, undefined> {
  for (let i = 0; i < ids.length; i += TWITCH_API_MAX_RESULTS) {
    const params = new URLSearchParams()
    for (const id of ids.slice(i, i + TWITCH_API_MAX_RESULTS)) {
      params.append('id', id)
    }
    const clips = await helixGet('/clips', params, TwitchClipSchema)
    yield* clips
  }
}

// ---------------------------------------------------------------------------
// Duration helpers
// ---------------------------------------------------------------------------

/**
 * Converts a Twitch video duration string (e.g. `1h2m3s`, `45m0s`, `30s`)
 * to an ISO 8601 duration string (e.g. `PT1H2M3S`).
 *
 * @returns ISO 8601 duration, or `null` if the input is invalid
 */
export function twitchDurationToISO8601(duration: string): string | null {
  const match = duration.trim().match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i)

  if (!match || (!match[1] && !match[2] && !match[3])) {
    return null
  }

  const hours = match[1] ? Number.parseInt(match[1], 10) : 0
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0
  const seconds = match[3] ? Number.parseInt(match[3], 10) : 0

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds)
  ) {
    return null
  }

  let iso = 'PT'
  if (hours > 0) {
    iso += `${hours}H`
  }
  if (minutes > 0) {
    iso += `${minutes}M`
  }
  if (seconds > 0 || iso === 'PT') {
    iso += `${seconds}S`
  }
  return iso
}

/**
 * Converts a clip duration in seconds to ISO 8601 duration.
 */
export function secondsToISO8601(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  const h = Math.floor(whole / 3600)
  const m = Math.floor((whole % 3600) / 60)
  const s = whole % 60

  let iso = 'PT'
  if (h > 0) {
    iso += `${h}H`
  }
  if (m > 0) {
    iso += `${m}M`
  }
  if (s > 0 || iso === 'PT') {
    iso += `${s}S`
  }
  return iso
}
