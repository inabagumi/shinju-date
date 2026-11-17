import type { Tables } from '@shinju-date/database'
import { HttpResponse, http } from 'msw'
import {
  ensureCollectionsSeeded,
  twitchUsers,
  twitchVideos,
  videos,
} from '../collections.js'
import { createIconResponse } from './icon.js'

/** Host Twitch serves user icons (and its default icons) from. */
const TWITCH_ICON_HOST = 'https://static-cdn.jtvnw.net'

/** Directory of the icons users upload themselves. */
const USER_ICON_DIRECTORY = 'jtv_user_pictures'

/** Directory of the icons Twitch gives users without one of their own. */
const DEFAULT_ICON_DIRECTORY = 'user-default-pictures-uv'

/** A user as returned by the Helix API (`GET /helix/users`). */
interface HelixUser {
  broadcaster_type: string
  created_at: string
  description: string
  display_name: string
  id: string
  login: string
  offline_image_url: string
  profile_image_url: string
  type: string
  view_count: number
}

function createUser({
  defaultIcon = false,
  displayName,
  id,
  login,
}: {
  defaultIcon?: boolean
  displayName: string
  id: string
  login: string
}): HelixUser {
  return {
    broadcaster_type: 'affiliate',
    created_at: '2020-01-01T00:00:00Z',
    description: `${displayName}のチャンネルです。`,
    display_name: displayName,
    id,
    login,
    offline_image_url: '',
    profile_image_url: defaultIcon
      ? `${TWITCH_ICON_HOST}/${DEFAULT_ICON_DIRECTORY}/294c98b5-e34d-42cd-a8f0-140b72fba9b0-profile_image-300x300.png`
      : `${TWITCH_ICON_HOST}/${USER_ICON_DIRECTORY}/mock-${id}-profile_image-300x300.png`,
    type: '',
    view_count: 0,
  }
}

/**
 * Users that can also be looked up by login. The second one has no icon of
 * its own, so the default icon fallback can be checked as well.
 */
const mockTwitchUsers: HelixUser[] = [
  createUser({
    displayName: 'Test User 1',
    id: '100000001',
    login: 'testuser1',
  }),
  createUser({
    defaultIcon: true,
    displayName: 'Test User 2',
    id: '100000002',
    login: 'testuser2',
  }),
]

/**
 * Finds a user by ID. Any other numeric ID is answered with a generated
 * user, so that the randomly generated `twitch_users` of the seed data can be
 * synced as well.
 */
function findUserById(id: string): HelixUser | undefined {
  const user = mockTwitchUsers.find((candidate) => candidate.id === id)

  if (user || !/^\d+$/.test(id)) {
    return user
  }

  return createUser({ displayName: `User ${id}`, id, login: `user${id}` })
}

/** The most items that a page of the Helix API has (`first`). */
const MAX_PAGE_SIZE = 100

/** The directories of the thumbnails of videos, streams and clips. */
const THUMBNAIL_DIRECTORIES = [
  'cf_vods',
  'previews-ttv',
  'twitch-clips-thumbnails-prod',
] as const

/** An error response of the Helix API. */
function helixError(status: 400 | 404, message: string): Response {
  return HttpResponse.json(
    { error: status === 400 ? 'Bad Request' : 'Not Found', message, status },
    { status },
  )
}

/** A timestamp as the Helix API returns it, such as `2026-01-01T00:00:00Z`. */
function toHelixTimestamp(text: string): string {
  return Temporal.Instant.from(text).toString({ smallestUnit: 'second' })
}

/** The seconds of an ISO 8601 duration, such as `PT2H34M12S`. */
function toSeconds(duration: string): number {
  return Temporal.Duration.from(duration).total('seconds')
}

/** A duration as the Helix API returns it for videos, such as `2h34m12s`. */
function toHelixDuration(duration: string): string {
  const total = Math.floor(toSeconds(duration))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  return `${hours > 0 ? `${hours}h` : ''}${hours > 0 || minutes > 0 ? `${minutes}m` : ''}${seconds}s`
}

/** A Twitch video of the Supabase mock, with its video and its user. */
interface MockTwitchVideo {
  twitchVideo: Tables<'twitch_videos'>
  user: Tables<'twitch_users'>
  video: Tables<'videos'>
}

/**
 * The Twitch videos of the Supabase mock (`twitch_videos` with their
 * `videos` and `twitch_users`), newest first like the Helix API returns
 * them. The Helix API answers with these, so that the apps find the videos
 * that they saved.
 */
async function getMockTwitchVideos(): Promise<MockTwitchVideo[]> {
  await ensureCollectionsSeeded()

  const usersById = new Map(
    twitchUsers.findMany().map((user) => [user.id, user]),
  )
  const videosById = new Map(
    videos.findMany().map((video) => [video.id, video]),
  )

  return twitchVideos
    .findMany()
    .flatMap((twitchVideo) => {
      const user = usersById.get(twitchVideo.twitch_user_id)
      const video = videosById.get(twitchVideo.video_id)

      return user && video && video.deleted_at === null
        ? [{ twitchVideo, user, video }]
        : []
    })
    .sort((a, b) =>
      Temporal.Instant.compare(b.video.published_at, a.video.published_at),
    )
}

/** A video as returned by the Helix API (`GET /helix/videos`). */
function toHelixVideo({ twitchVideo, user, video }: MockTwitchVideo) {
  const id = twitchVideo.twitch_video_id

  return {
    created_at: toHelixTimestamp(video.published_at),
    description: '',
    duration: toHelixDuration(video.duration),
    id,
    language: 'ja',
    muted_segments: null,
    published_at: toHelixTimestamp(video.published_at),
    stream_id: twitchVideo.stream_id,
    thumbnail_url: `${TWITCH_ICON_HOST}/cf_vods/mock/${id}/thumb/thumb0-%{width}x%{height}.jpg`,
    title: video.title,
    type: twitchVideo.type,
    url: `https://www.twitch.tv/videos/${id}`,
    user_id: user.twitch_user_id,
    user_login: user.twitch_login_name ?? '',
    user_name: user.name ?? '',
    view_count: 0,
    viewable: 'public',
  }
}

/** A stream as returned by the Helix API (`GET /helix/streams`). */
function toHelixStream({ twitchVideo, user, video }: MockTwitchVideo) {
  const login = user.twitch_login_name ?? ''

  return {
    game_id: '',
    game_name: '',
    id: twitchVideo.stream_id ?? '',
    is_mature: false,
    language: 'ja',
    started_at: toHelixTimestamp(video.published_at),
    tag_ids: [],
    tags: [],
    thumbnail_url: `${TWITCH_ICON_HOST}/previews-ttv/live_user_${login}-{width}x{height}.jpg`,
    title: video.title,
    type: 'live',
    user_id: user.twitch_user_id,
    user_login: login,
    user_name: user.name ?? '',
    viewer_count: 0,
  }
}

/** A clip as returned by the Helix API (`GET /helix/clips`). */
function toHelixClip({ twitchVideo, user, video }: MockTwitchVideo) {
  const id = twitchVideo.twitch_video_id

  return {
    broadcaster_id: user.twitch_user_id,
    broadcaster_name: user.name ?? '',
    created_at: toHelixTimestamp(video.published_at),
    creator_id: user.twitch_user_id,
    creator_name: user.name ?? '',
    duration: toSeconds(video.duration),
    embed_url: `https://clips.twitch.tv/embed?clip=${id}`,
    game_id: '',
    id,
    is_featured: false,
    language: 'ja',
    thumbnail_url: `${TWITCH_ICON_HOST}/twitch-clips-thumbnails-prod/${id}/preview-480x272.jpg`,
    title: video.title,
    url: `https://clips.twitch.tv/${id}`,
    video_id: '',
    view_count: 0,
    vod_offset: null,
  }
}

/**
 * A page of items with the `first` and `after` parameters of the Helix API.
 * The cursor of the next page is only given when there is one.
 */
function paginate<Item>(
  items: readonly Item[],
  searchParams: URLSearchParams,
  defaultSize = 20,
): Response {
  const first = searchParams.get('first')
  const size = first === null ? defaultSize : Number(first)

  if (!Number.isInteger(size) || size < 1 || size > MAX_PAGE_SIZE) {
    return helixError(
      400,
      `The value of "first" must be between 1 and ${MAX_PAGE_SIZE}`,
    )
  }

  const after = searchParams.get('after')
  const offset = after === null ? 0 : Number(atob(after))

  if (!Number.isInteger(offset) || offset < 0) {
    return helixError(400, 'The value of "after" is not a valid cursor')
  }

  const next = offset + size

  return HttpResponse.json({
    data: items.slice(offset, next),
    pagination: next < items.length ? { cursor: btoa(String(next)) } : {},
  })
}

/** The types of videos that `GET /helix/videos` lists. */
const HELIX_VIDEO_TYPES = ['archive', 'highlight', 'upload'] as const

export const twitchHandlers = [
  // App access tokens (client credentials flow)
  http.post('https://id.twitch.tv/oauth2/token', () =>
    HttpResponse.json({
      access_token: 'mock-twitch-app-access-token',
      expires_in: 5011271,
      token_type: 'bearer',
    }),
  ),

  // Helix API - Get Users
  http.get('https://api.twitch.tv/helix/users', ({ request }) => {
    const { searchParams } = new URL(request.url)
    const ids = searchParams.getAll('id')
    const logins = searchParams
      .getAll('login')
      .map((login) => login.toLowerCase())

    if (ids.length === 0 && logins.length === 0) {
      return HttpResponse.json(
        {
          error: 'Bad Request',
          message: 'Missing required parameter "id" or "login"',
          status: 400,
        },
        { status: 400 },
      )
    }

    const data = [
      ...ids.flatMap((id) => findUserById(id) ?? []),
      ...mockTwitchUsers.filter((user) => logins.includes(user.login)),
    ]

    return HttpResponse.json({ data })
  }),

  // Helix API - Get Videos, by ID (`id`, which all have to exist) or by
  // user (`user_id`, newest first)
  http.get('https://api.twitch.tv/helix/videos', async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const ids = searchParams.getAll('id')
    const userId = searchParams.get('user_id')
    const gameId = searchParams.get('game_id')
    const type = searchParams.get('type') ?? 'all'

    if (
      [ids.length > 0, userId !== null, gameId !== null].filter(Boolean)
        .length !== 1
    ) {
      return helixError(
        400,
        'Exactly one of the parameters "id", "user_id" or "game_id" is required',
      )
    }

    if (ids.length > MAX_PAGE_SIZE) {
      return helixError(400, `"id" can be given at most ${MAX_PAGE_SIZE} times`)
    }

    if (
      type !== 'all' &&
      !(HELIX_VIDEO_TYPES as readonly string[]).includes(type)
    ) {
      return helixError(400, `The value of "type" is not valid: ${type}`)
    }

    const helixVideos = (await getMockTwitchVideos())
      .filter(({ twitchVideo }) =>
        (HELIX_VIDEO_TYPES as readonly (string | null)[]).includes(
          twitchVideo.type,
        ),
      )
      .map(toHelixVideo)

    if (ids.length > 0) {
      const found = ids.flatMap(
        (id) => helixVideos.find((video) => video.id === id) ?? [],
      )

      // Like Helix, a lookup by ID that includes an ID that does not exist
      // is not found.
      return found.length === ids.length
        ? HttpResponse.json({ data: found, pagination: {} })
        : helixError(404, 'Not Found')
    }

    // The mock has no games, so a lookup by game finds nothing.
    return paginate(
      helixVideos.filter(
        (video) =>
          video.user_id === userId && (type === 'all' || video.type === type),
      ),
      searchParams,
    )
  }),

  // Helix API - Get Streams: the broadcasts on air (`LIVE` videos)
  http.get('https://api.twitch.tv/helix/streams', async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const userIds = searchParams.getAll('user_id')
    const userLogins = searchParams
      .getAll('user_login')
      .map((login) => login.toLowerCase())

    if (userIds.length + userLogins.length > MAX_PAGE_SIZE) {
      return helixError(
        400,
        `"user_id" and "user_login" can be given at most ${MAX_PAGE_SIZE} times`,
      )
    }

    const streams = (await getMockTwitchVideos())
      .filter(
        ({ twitchVideo, video }) =>
          video.status === 'LIVE' && twitchVideo.stream_id !== null,
      )
      .map(toHelixStream)
      .filter(
        (stream) =>
          (userIds.length === 0 && userLogins.length === 0) ||
          userIds.includes(stream.user_id) ||
          userLogins.includes(stream.user_login),
      )

    return paginate(streams, searchParams)
  }),

  // Helix API - Get Clips, by ID (`id`) or by broadcaster (`broadcaster_id`)
  http.get('https://api.twitch.tv/helix/clips', async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const ids = searchParams.getAll('id')
    const broadcasterId = searchParams.get('broadcaster_id')
    const gameId = searchParams.get('game_id')

    if (
      [ids.length > 0, broadcasterId !== null, gameId !== null].filter(Boolean)
        .length !== 1
    ) {
      return helixError(
        400,
        'Exactly one of the parameters "id", "broadcaster_id" or "game_id" is required',
      )
    }

    if (ids.length > MAX_PAGE_SIZE) {
      return helixError(400, `"id" can be given at most ${MAX_PAGE_SIZE} times`)
    }

    const clips = (await getMockTwitchVideos())
      .filter(({ twitchVideo }) => twitchVideo.type === 'clip')
      .map(toHelixClip)

    if (ids.length > 0) {
      // Clips that do not exist are left out.
      return HttpResponse.json({
        data: ids.flatMap((id) => clips.find((clip) => clip.id === id) ?? []),
        pagination: {},
      })
    }

    return paginate(
      clips.filter((clip) => clip.broadcaster_id === broadcasterId),
      searchParams,
    )
  }),

  // Thumbnails of videos, streams and clips
  ...THUMBNAIL_DIRECTORIES.map((directory) =>
    http.get(`${TWITCH_ICON_HOST}/${directory}/*`, ({ request }) =>
      createIconResponse(request, new URL(request.url).pathname),
    ),
  ),

  // User icon downloads. Conditional requests get 304 like on Twitch.
  http.get(
    `${TWITCH_ICON_HOST}/${USER_ICON_DIRECTORY}/:icon`,
    ({ params, request }) =>
      createIconResponse(request, String(params['icon'])),
  ),
  http.get(
    `${TWITCH_ICON_HOST}/${DEFAULT_ICON_DIRECTORY}/:icon`,
    ({ params, request }) =>
      createIconResponse(request, String(params['icon'])),
  ),
]
