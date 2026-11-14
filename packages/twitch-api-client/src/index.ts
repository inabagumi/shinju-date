import { ApiClient } from '@twurple/api'
import { AppTokenAuthProvider } from '@twurple/auth'
import { Temporal } from 'temporal-polyfill'

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
  /** ISO 8601 duration (e.g. PT1H2M3S), ready for videos.duration */
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
  /** ISO 8601 duration (e.g. PT30S), ready for videos.duration */
  duration: string
  vod_offset: number | null
}

export interface TwitchStream {
  id: string
  user_id: string
  user_login: string
  user_name: string
  game_id: string
  game_name: string
  type: 'live'
  title: string
  viewer_count: number
  started_at: string
  language: string
  /** Template URL with `{width}` / `{height}` placeholders */
  thumbnail_url: string
  tags: string[]
  is_mature: boolean
}

/**
 * Prefix for synthetic `twitch_videos.twitch_video_id` values while a stream is
 * live (or recently ended) and the archive VOD id is not yet known.
 * Helix video IDs are numeric; this prefix avoids collisions.
 */
export const LIVE_TWITCH_VIDEO_ID_PREFIX = 'live:' as const

/**
 * Builds a stable synthetic platform id for a live (or pending-archive) stream.
 */
export function toLiveTwitchVideoId(streamId: string): string {
  return `${LIVE_TWITCH_VIDEO_ID_PREFIX}${streamId}`
}

/**
 * Returns true when `twitch_video_id` is a synthetic live placeholder.
 */
export function isLiveTwitchVideoId(twitchVideoId: string): boolean {
  return twitchVideoId.startsWith(LIVE_TWITCH_VIDEO_ID_PREFIX)
}

/**
 * Extracts the Helix stream id from a synthetic live video id, or null.
 */
export function streamIdFromLiveTwitchVideoId(
  twitchVideoId: string,
): string | null {
  if (!isLiveTwitchVideoId(twitchVideoId)) {
    return null
  }
  return twitchVideoId.slice(LIVE_TWITCH_VIDEO_ID_PREFIX.length)
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
  return Temporal.Instant.fromEpochMilliseconds(date.getTime()).toString()
}

/**
 * Converts a duration in seconds to ISO 8601 (e.g. PT1H2M3S) via Temporal.
 * Uses twurple's durationInSeconds rather than re-parsing Twitch's "1h2m3s" strings.
 */
function durationFromSeconds(seconds: number): string {
  return Temporal.Duration.from({
    seconds: Math.max(0, Math.floor(seconds)),
  })
    .round({ largestUnit: 'hour' })
    .toString()
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
  durationInSeconds: number
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
    duration: durationFromSeconds(video.durationInSeconds),
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
    duration: durationFromSeconds(clip.duration),
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

function mapStream(stream: {
  id: string
  userId: string
  userName: string
  userDisplayName: string
  gameId: string
  gameName: string
  type: string
  title: string
  viewers: number
  startDate: Date
  language: string
  thumbnailUrl: string
  tags: string[]
  isMature: boolean
}): TwitchStream | null {
  // Helix currently only returns type "live" for Get Streams.
  if (stream.type !== 'live') {
    return null
  }

  return {
    game_id: stream.gameId,
    game_name: stream.gameName,
    id: stream.id,
    is_mature: stream.isMature,
    language: stream.language,
    started_at: toIsoString(stream.startDate),
    tags: stream.tags,
    thumbnail_url: stream.thumbnailUrl,
    title: stream.title,
    type: 'live',
    user_id: stream.userId,
    user_login: stream.userName,
    user_name: stream.userDisplayName,
    viewer_count: stream.viewers,
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

/**
 * Returns true when a Helix call failed with HTTP 404.
 */
function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    error.statusCode === 404
  )
}

/**
 * Looks up resources by ID, treating a Helix 404 as "these IDs are gone".
 *
 * Helix answers 404 instead of an empty list when a lookup by ID matches
 * nothing, and twurple surfaces that as an error. A failing batch is split in
 * half and retried so the IDs that still exist are returned and only the
 * missing ones are dropped.
 */
async function lookupByIds<T>(
  ids: string[],
  lookup: (ids: string[]) => Promise<T[]>,
): Promise<T[]> {
  if (ids.length === 0) {
    return []
  }

  try {
    return await lookup(ids)
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }

    if (ids.length === 1) {
      return []
    }

    const middle = Math.ceil(ids.length / 2)

    return [
      ...(await lookupByIds(ids.slice(0, middle), lookup)),
      ...(await lookupByIds(ids.slice(middle), lookup)),
    ]
  }
}

export interface GetVideosOptions {
  ids: string[]
}

/**
 * Gets Twitch videos (VOD / highlight / upload) by ID.
 * IDs that no longer exist are omitted.
 */
export async function* getVideos({
  ids,
}: GetVideosOptions): AsyncGenerator<TwitchVideo, void, undefined> {
  const client = getTwitchApiClient()

  for (let i = 0; i < ids.length; i += TWITCH_API_MAX_RESULTS) {
    const chunk = ids.slice(i, i + TWITCH_API_MAX_RESULTS)
    const videos = await lookupByIds(chunk, (chunkIds) =>
      client.videos.getVideosByIds(chunkIds),
    )
    for (const video of videos) {
      const mapped = mapVideo(video)
      if (mapped) {
        yield mapped
      }
    }
  }
}

export interface GetVideosByUserOptions {
  /** Drain every page when true (default: first page only). */
  all?: boolean
  /** Page size, up to 100 (default: 20). */
  limit?: number
  type?: 'archive' | 'highlight' | 'upload' | 'all'
  userId: string
}

/**
 * Gets videos for a broadcaster, newest first (for batch discovery).
 * Returns the first page by default; pass `all: true` to drain all pages.
 */
export async function* getVideosByUser({
  all = false,
  limit = 20,
  type = 'archive',
  userId,
}: GetVideosByUserOptions): AsyncGenerator<TwitchVideo, void, undefined> {
  const client = getTwitchApiClient()

  if (all) {
    const paginator = client.videos.getVideosByUserPaginated(userId, { type })

    for await (const video of paginator) {
      const mapped = mapVideo(video)
      if (mapped) {
        yield mapped
      }
    }
    return
  }

  const { data: videos } = await client.videos.getVideosByUser(userId, {
    limit,
    type,
  })

  for (const video of videos) {
    const mapped = mapVideo(video)
    if (mapped) {
      yield mapped
    }
  }
}

export interface GetVideosByUserPageOptions {
  /** Cursor returned by the previous page; omit for the newest videos. */
  after?: string | undefined
  /** Page size, up to 100 (default: 100). */
  limit?: number
  type?: 'archive' | 'highlight' | 'upload' | 'all'
  userId: string
}

export interface TwitchVideoPage {
  /** Cursor of the next page, or `null` when this was the last one. */
  cursor: string | null
  videos: TwitchVideo[]
}

/**
 * Gets one page of a broadcaster's videos, newest first.
 *
 * Unlike {@link getVideosByUser} with `all`, the caller keeps the cursor, so a
 * long history can be walked across several runs.
 */
export async function getVideosByUserPage({
  after,
  limit = TWITCH_API_MAX_RESULTS,
  type = 'archive',
  userId,
}: GetVideosByUserPageOptions): Promise<TwitchVideoPage> {
  const client = getTwitchApiClient()
  const { cursor, data } = await client.videos.getVideosByUser(userId, {
    limit,
    type,
    ...(after ? { after } : {}),
  })

  return {
    // Helix may still return a cursor along with the last page; the empty
    // page that follows it ends the walk.
    cursor: data.length > 0 && cursor ? cursor : null,
    videos: data.flatMap((video) => {
      const mapped = mapVideo(video)
      return mapped ? [mapped] : []
    }),
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
 * IDs that no longer exist are omitted.
 */
export async function* getClips({
  ids,
}: GetClipsOptions): AsyncGenerator<TwitchClip, void, undefined> {
  const client = getTwitchApiClient()

  for (let i = 0; i < ids.length; i += TWITCH_API_MAX_RESULTS) {
    const chunk = ids.slice(i, i + TWITCH_API_MAX_RESULTS)
    const clips = await lookupByIds(chunk, (chunkIds) =>
      client.clips.getClipsByIds(chunkIds),
    )
    for (const clip of clips) {
      yield mapClip(clip)
    }
  }
}

// ---------------------------------------------------------------------------
// Streams (live broadcasts)
// ---------------------------------------------------------------------------

export interface GetStreamsByUserIdsOptions {
  userIds: string[]
}

/**
 * Gets currently live streams for the given Helix user IDs.
 * Offline users are omitted from the response (same as Helix).
 */
export async function* getStreamsByUserIds({
  userIds,
}: GetStreamsByUserIdsOptions): AsyncGenerator<TwitchStream, void, undefined> {
  if (userIds.length === 0) {
    return
  }

  const client = getTwitchApiClient()

  for (let i = 0; i < userIds.length; i += TWITCH_API_MAX_RESULTS) {
    const chunk = userIds.slice(i, i + TWITCH_API_MAX_RESULTS)
    const streams = await client.streams.getStreamsByUserIds(chunk)
    for (const stream of streams) {
      const mapped = mapStream(stream)
      if (mapped) {
        yield mapped
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Broadcasts
//
// What a broadcast looks like on Twitch, shared by the crawler and the admin
// app so both read a stream's state the same way.
// ---------------------------------------------------------------------------

/** The `videos.status` a finished Twitch video or clip is shown with. */
export type TwitchVideoStatus = 'ENDED' | 'PUBLISHED'

/**
 * Archives and highlights are past broadcasts; uploads and clips are regular
 * videos.
 */
export function getTwitchVideoStatus(
  type: TwitchVideo['type'] | 'clip',
): TwitchVideoStatus {
  return type === 'upload' || type === 'clip' ? 'PUBLISHED' : 'ENDED'
}

/**
 * The ID of the stream a video is the archive of, or `null` for any other
 * video.
 *
 * Twitch creates the archive as soon as a broadcast starts, so it may exist
 * while the stream is still on air: an archive alone does not mean the
 * broadcast ended.
 */
export function getArchivedStreamId(video: TwitchVideo): string | null {
  return video.type === 'archive' && video.stream_id ? video.stream_id : null
}

export interface GetBroadcastOptions {
  /** Helix stream ID of the broadcast. */
  streamId: string
  /** Helix user ID of the broadcaster. */
  userId: string
}

/**
 * Gets the stream of a broadcast while it is on air.
 *
 * @returns `null` once the broadcast is offline.
 */
export async function getLiveStream({
  streamId,
  userId,
}: GetBroadcastOptions): Promise<TwitchStream | null> {
  for await (const stream of getStreamsByUserIds({ userIds: [userId] })) {
    if (stream.id === streamId) {
      return stream
    }
  }

  return null
}

/**
 * Finds the archive (VOD) of a broadcast among the broadcaster's newest
 * archives.
 *
 * @returns `null` when Twitch keeps no archive of it (VODs disabled, expired
 *   or deleted) or it is older than the newest {@link TWITCH_API_MAX_RESULTS}.
 */
export async function getArchiveOfStream({
  streamId,
  userId,
}: GetBroadcastOptions): Promise<TwitchVideo | null> {
  for await (const video of getVideosByUser({
    limit: TWITCH_API_MAX_RESULTS,
    type: 'archive',
    userId,
  })) {
    if (getArchivedStreamId(video) === streamId) {
      return video
    }
  }

  return null
}
