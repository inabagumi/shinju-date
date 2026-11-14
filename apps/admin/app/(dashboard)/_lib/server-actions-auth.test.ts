import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 未認証のリクエストで mutation 系 Server Action が更新処理を行わず、
 * 共通の未認証レスポンスを返すことを確認する。
 */

const mocks = vi.hoisted(() => ({
  adminFrom: vi.fn(),
  createAuditLog: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getRedisClient: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTags: vi.fn(),
}))

vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}))
vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseClient: { from: mocks.adminFrom },
}))
vi.mock('@/lib/redis', () => ({
  getRedisClient: mocks.getRedisClient,
}))
vi.mock('@/lib/audit-log', () => ({
  createAuditLog: mocks.createAuditLog,
}))
vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))
vi.mock('@shinju-date/web-cache', () => ({
  revalidateTags: mocks.revalidateTags,
}))

import { unauthenticatedFormState, unauthenticatedResult } from '@/lib/auth'
import { updateUserEmail, updateUserPassword } from '../account/_actions'
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  updateAnnouncementAction,
} from '../announcements/_actions'
import {
  markFeatureRequestAsRead,
  updateFeatureRequestMemo,
  updateFeatureRequestStatus,
} from '../feedback/_actions/update-feedback'
import {
  addQueryAction,
  deleteQueryAction,
} from '../recommended-queries/_actions'
import {
  activateTalentAction,
  createTalentAction,
  deleteTalentAction,
  restoreTalentAction,
  retireTalentAction,
  updateTalentAction,
} from '../talents/_actions'
import {
  addYouTubeChannelAction,
  removeYouTubeChannelAction,
} from '../talents/_actions/channels'
import {
  syncTalentWithTwitch,
  syncTalentWithYouTube,
} from '../talents/_actions/sync'
import {
  addTwitchUserAction,
  removeTwitchUserAction,
} from '../talents/_actions/twitch-users'
import {
  createTermAction,
  deleteTermAction,
  updateTermAction,
} from '../terms/_actions'
import {
  restoreAction,
  softDeleteAction,
  toggleVisibilityAction,
} from '../videos/_actions'
import {
  syncVideoWithTwitch,
  syncVideoWithYouTube,
} from '../videos/_actions/sync'
import {
  disableMaintenanceMode,
  enableMaintenanceMode,
} from './maintenance-mode-actions'

const ID = '00000000-0000-4000-8000-000000000000'

function formData(entries: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value)
  }
  return data
}

const formActions: [string, () => Promise<unknown>][] = [
  [
    'createAnnouncementAction',
    () =>
      createAnnouncementAction(
        {},
        formData({
          end_at: '2025-01-02T00:00:00Z',
          message: 'message',
          start_at: '2025-01-01T00:00:00Z',
        }),
      ),
  ],
  [
    'updateAnnouncementAction',
    () =>
      updateAnnouncementAction(
        {},
        formData({
          end_at: '2025-01-02T00:00:00Z',
          id: ID,
          message: 'message',
          start_at: '2025-01-01T00:00:00Z',
        }),
      ),
  ],
  [
    'createTalentAction',
    () => createTalentAction({}, formData({ name: 'talent' })),
  ],
  [
    'updateTalentAction',
    () => updateTalentAction({}, formData({ id: ID, name: 'talent' })),
  ],
  [
    'addYouTubeChannelAction',
    () =>
      addYouTubeChannelAction(
        {},
        formData({ talent_id: ID, youtube_channel_id: '@handle' }),
      ),
  ],
  [
    'addTwitchUserAction',
    () =>
      addTwitchUserAction(
        {},
        formData({ talent_id: ID, twitch_user: 'login' }),
      ),
  ],
  ['createTermAction', () => createTermAction({}, formData({ term: 'term' }))],
  [
    'updateTermAction',
    () => updateTermAction({}, formData({ id: ID, term: 'term' })),
  ],
  [
    'updateUserEmail',
    () => updateUserEmail({}, formData({ email: 'admin@example.com' })),
  ],
  [
    'updateUserPassword',
    () =>
      updateUserPassword(
        {},
        formData({
          confirmPassword: 'new-password',
          currentPassword: 'password123',
          newPassword: 'new-password',
        }),
      ),
  ],
]

const resultActions: [string, () => Promise<unknown>][] = [
  ['deleteAnnouncementAction', () => deleteAnnouncementAction(ID)],
  [
    'updateFeatureRequestStatus',
    () => updateFeatureRequestStatus(ID, 'resolved'),
  ],
  ['updateFeatureRequestMemo', () => updateFeatureRequestMemo(ID, 'memo')],
  ['markFeatureRequestAsRead', () => markFeatureRequestAsRead(ID, true)],
  ['addQueryAction', () => addQueryAction('query')],
  ['deleteQueryAction', () => deleteQueryAction('query')],
  ['deleteTalentAction', () => deleteTalentAction(ID)],
  ['restoreTalentAction', () => restoreTalentAction(ID)],
  ['retireTalentAction', () => retireTalentAction(ID)],
  ['activateTalentAction', () => activateTalentAction(ID)],
  ['removeYouTubeChannelAction', () => removeYouTubeChannelAction(ID, ID)],
  ['removeTwitchUserAction', () => removeTwitchUserAction(ID, ID)],
  ['syncTalentWithYouTube', () => syncTalentWithYouTube(ID)],
  ['syncTalentWithTwitch', () => syncTalentWithTwitch(ID)],
  ['deleteTermAction', () => deleteTermAction(ID)],
  ['toggleVisibilityAction', () => toggleVisibilityAction([ID])],
  ['softDeleteAction', () => softDeleteAction([ID])],
  ['restoreAction', () => restoreAction([ID])],
  ['syncVideoWithYouTube', () => syncVideoWithYouTube(ID)],
  ['syncVideoWithTwitch', () => syncVideoWithTwitch(ID)],
  ['enableMaintenanceMode', () => enableMaintenanceMode()],
  ['disableMaintenanceMode', () => disableMaintenanceMode()],
]

function expectNoSideEffects() {
  expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  expect(mocks.adminFrom).not.toHaveBeenCalled()
  expect(mocks.getRedisClient).not.toHaveBeenCalled()
  expect(mocks.createAuditLog).not.toHaveBeenCalled()
  expect(mocks.revalidatePath).not.toHaveBeenCalled()
  expect(mocks.revalidateTags).not.toHaveBeenCalled()
}

describe('mutation Server Actions without an authenticated user', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuthenticatedUser.mockResolvedValue(null)
  })

  it.each(formActions)(
    '%s returns an unauthenticated FormState',
    async (_name, action) => {
      await expect(action()).resolves.toEqual(unauthenticatedFormState())
      expect(mocks.requireAuthenticatedUser).toHaveBeenCalledOnce()
      expectNoSideEffects()
    },
  )

  it.each(resultActions)(
    '%s returns an unauthenticated result',
    async (_name, action) => {
      await expect(action()).resolves.toEqual(unauthenticatedResult())
      expect(mocks.requireAuthenticatedUser).toHaveBeenCalledOnce()
      expectNoSideEffects()
    },
  )
})
