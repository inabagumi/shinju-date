import { ApiClient } from '@twurple/api'
import { AppTokenAuthProvider } from '@twurple/auth'

export const TWITCH_API_MAX_RESULTS = 100

// ---------------------------------------------------------------------------
// Domain DTOs (stable for admin / batch consumers)
// ---------------------------------------------------------------------------

export interface TwitchUser {
  id: string
  login: string
  display_name: string
  description: string
  profile_image_url: string
  offline_image_url: string
  broadcaster_type: string
  type: string
  created_at: string
}

export interface TwitchVideo {
  id: string
  title: string
  description: string
  duration: string
  language: string
  published_at: string
  created_at: string
  thumbnail_url: string
  type: 'archive' | 'highlight' | 'upload'
  url: string
  user_id: string
  user_login: string
  user_name: string
  view_count: number
  viewable: string
  stream_id: string | null
}

export interface TwitchClip {
  id: string
  title: string
  url: string
  embed_url: string
  broadcaster_id: string
  broadcaster_name: string
  creator_id: string
  creator_name: string
  video_id: string
  game_id: string
  language: string
  thumbnail_url: string
  view_count: number
  created_at: string
  duration: number
  vod_offset: number | null
}

// ---------------------------------------------------------------------------
// Client lifecycle
// ---------------------------------------------------------------------------

export interface TwitchCredentials {
  clientId: string
  clientSecret: string
}

let _credentials: TwitchCredentials | null = null
let _apiClient: ApiClient | null = null

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
 * Returns a singleton twurple ApiClient using App Access Token auth.
 */
export function getTwitchApiClient(
  credentials: TwitchCredentials = getTwitchCredentials(),
): ApiClient {
  if (
    _apiClient &&
    _credentials &&
    _credentials.clientId === credentials.clientId &&
    _credentials.clientSecret === credentials.clientSecret
  ) {
    return _apiClient
  }

  const authProvider = new AppTokenAuthProvider(
    credentials.clientId,
    credentials.clientSecret,
  )
  _apiClient = new ApiClient({ authProvider })
  _credentials = credentials
  return _apiClient
}

/**
 * Resets cached credentials and client (for tests).
 */
export function resetTwitchClientState(): void {
  _credentials = null
  _apiClient = null
}

/**
 * Fetches an App Access Token via twurple's auth provider.
 * Prefer getTwitchApiClient() for API calls; this is exposed for diagnostics.
 */
export async function getAppAccessToken(
  credentials: TwitchCredentials = getTwitchCredentials(),
): Promise<string> {
  const authProvider = new AppTokenAuthProvider(
    credentials.clientId,
    credentials.clientSecret,
  )
  const token = await authProvider.getAppAccessToken()
  return token.accessToken
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
        const pathMatch = url.pathname.match(/^\/([a-zA-Z0-9_]{4,25})(?:\/|$)/i)
        if (pathMatch?.[1]) {
          const segment = pathMatch[1].toLowerCase()
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
// Mappers
// ---------------------------------------------------------------------------

function toIsoString(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function mapUser(user: {
  id: string
  name: string
  displayName: string
  description: string
  profilePictureUrl: string
  offlinePlaceholderUrl: string
  broadcasterType: string
  type: string
  creationDate: Date
}): TwitchUser {
  return {
    broadcaster_type: user.broadcasterType,
    created_at: toIsoString(user.creationDate),
    description: user.description,
    display_name: user.displayName,
    id: user.id,
    login: user.name,
    offline_image_url: user.offlinePlaceholderUrl,
    profile_image_url: user.profilePictureUrl,
    type: user.type,
  }
}

function mapVideo(video: {
  id: string
  title: string
  description: string
  duration: string
  language: string
  publishDate: Date
  creationDate: Date
  thumbnailUrl: string
  type: string
  url: string
  userId: string
  userName: string
  userDisplayName: string
  views: number
  isPublic: boolean
  streamId: string | null
}): TwitchVideo | null {
  if (
    video.type !== 'archive' &&
    video.type !== 'highlight' &&
    video.type !== 'upload'
  ) {
    return null
  }

  return {
    created_at: toIsoString(video.creationDate),
    description: video.description,
    duration: video.duration,
    id: video.id,
    language: video.language,
    published_at: toIsoString(video.publishDate),
    stream_id: video.streamId,
    thumbnail_url: video.thumbnailUrl,
    title: video.title,
    type: video.type,
    url: video.url,
    user_id: video.userId,
    user_login: video.userName,
    user_name: video.userDisplayName,
    view_count: video.views,
    viewable: video.isPublic ? 'public' : 'private',
  }
}

function mapClip(clip: {
  id: string
  title: string
  url: string
  embedUrl: string
  broadcasterId: string
  broadcasterDisplayName: string
  creatorId: string
  creatorDisplayName: string
  videoId: string
  gameId: string
  language: string
  thumbnailUrl: string
  views: number
  creationDate: Date
  duration: number
  vodOffset: number | null
}): TwitchClip {
  return {
    broadcaster_id: clip.broadcasterId,
    broadcaster_name: clip.broadcasterDisplayName,
    created_at: toIsoString(clip.creationDate),
    creator_id: clip.creatorId,
    creator_name: clip.creatorDisplayName,
    duration: clip.duration,
    embed_url: clip.embedUrl,
    game_id: clip.gameId,
    id: clip.id,
    language: clip.language,
    thumbnail_url: clip.thumbnailUrl,
    title: clip.title,
    url: clip.url,
    video_id: clip.videoId,
    view_count: clip.views,
    vod_offset: clip.vodOffset,
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface GetUsersOptions {
  ids?: string[]
  logins?: string[]
}

/**
 * Gets Twitch users by ID and/or login.
 */
export async function* getUsers({
  ids = [],
  logins = [],
}: GetUsersOptions): AsyncGenerator<TwitchUser, void, undefined> {
  if (ids.length === 0 && logins.length === 0) {
    return
  }

  const client = getTwitchApiClient()

  for (let i = 0; i < ids.length; i += TWITCH_API_MAX_RESULTS) {
    const chunk = ids.slice(i, i + TWITCH_API_MAX_RESULTS)
    const users = await client.users.getUsersByIds(chunk)
    for (const user of users) {
      yield mapUser(user)
    }
  }

  for (let i = 0; i < logins.length; i += TWITCH_API_MAX_RESULTS) {
    const chunk = logins.slice(i, i + TWITCH_API_MAX_RESULTS)
    const users = await client.users.getUsersByNames(chunk)
    for (const user of users) {
      yield mapUser(user)
    }
  }
}

export async function getUserById(id: string): Promise<TwitchUser | null> {
  const user = await getTwitchApiClient().users.getUserById(id)
  return user ? mapUser(user) : null
}

export async function getUserByLogin(
  login: string,
): Promise<TwitchUser | null> {
  const user = await getTwitchApiClient().users.getUserByName(
    login.toLowerCase(),
  )
  return user ? mapUser(user) : null
}

/**
 * Resolves a parsed identifier to a Twitch user via Helix.
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
  const client = getTwitchApiClient()

  for (let i = 0; i < ids.length; i += TWITCH_API_MAX_RESULTS) {
    const chunk = ids.slice(i, i + TWITCH_API_MAX_RESULTS)
    const videos = await client.videos.getVideosByIds(chunk)
    for (const video of videos) {
      const mapped = mapVideo(video)
      if (mapped) {
        yield mapped
      }
    }
  }
}

/**
 * Gets videos for a broadcaster (for batch discovery).
 * Uses twurple's paginator under the hood for the first page by default;
 * pass `all: true` to drain all pages.
 */
export async function* getVideosByUser(options: {
  userId: string
  type?: 'archive' | 'highlight' | 'upload' | 'all'
  all?: boolean
}): AsyncGenerator<TwitchVideo, void, undefined> {
  const client = getTwitchApiClient()
  const paginator = client.videos.getVideosByUserPaginated(options.userId, {
    type: options.type ?? 'archive',
  })

  if (options.all) {
    for await (const video of paginator) {
      const mapped = mapVideo(video)
      if (mapped) {
        yield mapped
      }
    }
    return
  }

  const page = await paginator.getNext()
  for (const video of page ?? []) {
    const mapped = mapVideo(video)
    if (mapped) {
      yield mapped
    }
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
  const client = getTwitchApiClient()

  for (let i = 0; i < ids.length; i += TWITCH_API_MAX_RESULTS) {
    const chunk = ids.slice(i, i + TWITCH_API_MAX_RESULTS)
    const clips = await client.clips.getClipsByIds(chunk)
    for (const clip of clips) {
      yield mapClip(clip)
    }
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
