import { HttpResponse, http } from 'msw'
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
