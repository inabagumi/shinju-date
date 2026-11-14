'use server'

import { logger } from '@shinju-date/logger'
import type {
  ProfileImageSyncResult,
  SavedYouTubeChannelIcon,
} from '@shinju-date/scraper/youtube'
import { toDBString } from '@shinju-date/temporal-fns'
import { getUsers } from '@shinju-date/twitch-api-client'
import { revalidateTags } from '@shinju-date/web-cache'
import { getChannels } from '@shinju-date/youtube-api-client'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import { createAuditLog } from '@/lib/audit-log'
import {
  type AuthenticatedContext,
  requireAuthenticatedUser,
  unauthenticatedResult,
} from '@/lib/auth'
import {
  hasProfileImageChanged,
  syncYouTubeChannelIconSafely,
} from '@/lib/youtube-channel-icon'

type SupabaseClient = AuthenticatedContext['supabaseClient']

interface SyncResult {
  success: boolean
  error?: string
  message?: string
  unchanged?: boolean
}

interface SavedYouTubeChannel extends SavedYouTubeChannelIcon {
  name: string | null
  youtube_handle: string | null
}

interface SavedTwitchUser {
  id: string
  name: string | null
  twitch_user_id: string
  twitch_login_name: string | null
}

/** The result of syncing the accounts of one platform. */
type PlatformSyncOutcome =
  /** The talent has no account on the platform. */
  | { status: 'no_accounts' }
  | { status: 'unchanged' }
  | { status: 'updated' }
  | { status: 'failed'; error: string }

const YOUTUBE_CHANNEL_NOT_FOUND_ERROR =
  'YouTubeでチャンネルが見つかりませんでした。チャンネルIDが正しいか確認してください。'
const TWITCH_USER_NOT_FOUND_ERROR =
  'Twitchでユーザーが見つかりませんでした。ユーザーIDが正しいか確認してください。'

const NO_YOUTUBE_CHANNELS_ERROR =
  'このタレントに紐づくYouTubeチャンネルはありません。'
const NO_TWITCH_USERS_ERROR = 'このタレントに紐づくTwitchユーザーはありません。'
const NO_ACCOUNTS_ERROR =
  'このタレントに紐づくYouTubeチャンネル・Twitchユーザーはありません。'
const TALENT_NOT_FOUND_ERROR = 'タレントが見つかりませんでした。'

const YOUTUBE_UNCHANGED_MESSAGE = 'チャンネル情報は既に最新です。'
const TWITCH_UNCHANGED_MESSAGE = 'Twitchユーザー情報は既に最新です。'

/** Normalizes an embedded one-to-many relation to an array. */
function toList<T>(relation: T | T[] | null | undefined): NonNullable<T>[] {
  const list = Array.isArray(relation) ? relation : relation ? [relation] : []

  return list.filter((item): item is NonNullable<T> => item != null)
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '予期しないエラーが発生しました。'
}

/** Marks the talent as changed and refreshes the pages that show it. */
async function touchTalent(
  supabaseClient: SupabaseClient,
  talentId: string,
): Promise<void> {
  // Touch talent.updated_at so list views reflect that channel data changed
  const { error: updateError } = await supabaseClient
    .from('talents')
    .update({
      updated_at: toDBString(Temporal.Now.instant()),
    })
    .eq('id', talentId)

  if (updateError) {
    throw updateError
  }
}

async function revalidateTalent(talentId: string): Promise<void> {
  revalidatePath(`/talents/${talentId}`)
  revalidatePath('/talents')
  await revalidateTags(['talents', 'videos'])
}

/**
 * Syncs the given YouTube channels of a talent with the YouTube API.
 * Never throws: failures are returned as `failed`.
 */
async function syncYouTubeChannels(
  supabaseClient: SupabaseClient,
  talentId: string,
  channels: readonly SavedYouTubeChannel[],
): Promise<PlatformSyncOutcome> {
  if (channels.length === 0) {
    return { status: 'no_accounts' }
  }

  try {
    const youtubeChannels = await Array.fromAsync(
      getChannels({
        ids: channels.map((channel) => channel.youtube_channel_id),
      }),
    )

    if (youtubeChannels.length === 0) {
      return { error: YOUTUBE_CHANNEL_NOT_FOUND_ERROR, status: 'failed' }
    }

    const youtubeChannelById = new Map(
      youtubeChannels.map((youtubeChannel) => [
        youtubeChannel.id,
        youtubeChannel,
      ]),
    )

    const channelChanges: {
      youtube_channel_id: string
      before: { name: string | null; youtube_handle: string | null }
      after: { name: string; youtube_handle: string | null }
      profile_image?: Exclude<ProfileImageSyncResult, 'unchanged'>
    }[] = []

    let syncedCount = 0

    for (const channel of channels) {
      const youtubeChannel = youtubeChannelById.get(channel.youtube_channel_id)

      if (!youtubeChannel) {
        logger.warn('YouTubeでチャンネルが見つかりませんでした', {
          talentId,
          youtubeChannelId: channel.youtube_channel_id,
        })
        continue
      }

      if (!youtubeChannel.snippet?.title) {
        logger.warn('YouTubeからチャンネル情報を取得できませんでした', {
          talentId,
          youtubeChannelId: channel.youtube_channel_id,
        })
        continue
      }

      const channelName = youtubeChannel.snippet.title
      const youtubeHandle = youtubeChannel.snippet.customUrl || null

      const { error: youtubeError } = await supabaseClient
        .from('youtube_channels')
        .upsert(
          {
            id: channel.id,
            name: channelName,
            talent_id: talentId,
            youtube_channel_id: channel.youtube_channel_id,
            youtube_handle: youtubeHandle,
          },
          { onConflict: 'id' },
        )

      if (youtubeError) {
        logger.error('youtube_channelsテーブルへの書き込みに失敗しました', {
          error: youtubeError,
          talentId,
          youtubeChannelId: channel.youtube_channel_id,
        })
        continue
      }

      syncedCount++

      const profileImageResult = await syncYouTubeChannelIconSafely(
        youtubeChannel,
        channel,
      )
      const profileImageChanged = hasProfileImageChanged(profileImageResult)

      if (
        channelName !== channel.name ||
        youtubeHandle !== channel.youtube_handle ||
        profileImageChanged
      ) {
        channelChanges.push({
          after: {
            name: channelName,
            youtube_handle: youtubeHandle,
          },
          before: {
            name: channel.name,
            youtube_handle: channel.youtube_handle,
          },
          ...(profileImageChanged ? { profile_image: profileImageResult } : {}),
          youtube_channel_id: channel.youtube_channel_id,
        })
      }
    }

    if (syncedCount === 0) {
      return { error: YOUTUBE_CHANNEL_NOT_FOUND_ERROR, status: 'failed' }
    }

    if (channelChanges.length === 0) {
      return { status: 'unchanged' }
    }

    await touchTalent(supabaseClient, talentId)

    await createAuditLog('CHANNEL_SYNC', 'channels', talentId, {
      channels: channelChanges,
    })

    await revalidateTalent(talentId)

    return { status: 'updated' }
  } catch (error) {
    logger.error('タレントの同期に失敗しました', { error, talentId })

    return { error: toErrorMessage(error), status: 'failed' }
  }
}

/**
 * Syncs the given Twitch users of a talent with the Helix API.
 * Never throws: failures are returned as `failed`.
 */
async function syncTwitchUsers(
  supabaseClient: SupabaseClient,
  talentId: string,
  users: readonly SavedTwitchUser[],
): Promise<PlatformSyncOutcome> {
  if (users.length === 0) {
    return { status: 'no_accounts' }
  }

  try {
    const twitchUsers = await Array.fromAsync(
      getUsers({
        ids: users.map((user) => user.twitch_user_id),
      }),
    )

    if (twitchUsers.length === 0) {
      return { error: TWITCH_USER_NOT_FOUND_ERROR, status: 'failed' }
    }

    const twitchUserById = new Map(
      twitchUsers.map((twitchUser) => [twitchUser.id, twitchUser]),
    )

    const userChanges: {
      twitch_user_id: string
      before: { name: string | null; twitch_login_name: string | null }
      after: { name: string; twitch_login_name: string }
    }[] = []

    let syncedCount = 0

    for (const user of users) {
      const twitchUser = twitchUserById.get(user.twitch_user_id)

      if (!twitchUser) {
        logger.warn('Twitchでユーザーが見つかりませんでした', {
          talentId,
          twitchUserId: user.twitch_user_id,
        })
        continue
      }

      const displayName = twitchUser.display_name
      const loginName = twitchUser.login

      const { error: upsertError } = await supabaseClient
        .from('twitch_users')
        .upsert(
          {
            id: user.id,
            name: displayName,
            talent_id: talentId,
            twitch_login_name: loginName,
            twitch_user_id: user.twitch_user_id,
          },
          { onConflict: 'id' },
        )

      if (upsertError) {
        logger.error('twitch_usersテーブルへの書き込みに失敗しました', {
          error: upsertError,
          talentId,
          twitchUserId: user.twitch_user_id,
        })
        continue
      }

      syncedCount++

      if (displayName !== user.name || loginName !== user.twitch_login_name) {
        userChanges.push({
          after: {
            name: displayName,
            twitch_login_name: loginName,
          },
          before: {
            name: user.name,
            twitch_login_name: user.twitch_login_name,
          },
          twitch_user_id: user.twitch_user_id,
        })
      }
    }

    if (syncedCount === 0) {
      return { error: TWITCH_USER_NOT_FOUND_ERROR, status: 'failed' }
    }

    if (userChanges.length === 0) {
      return { status: 'unchanged' }
    }

    await touchTalent(supabaseClient, talentId)

    await createAuditLog('CHANNEL_SYNC', 'twitch_users', talentId, {
      platform: 'twitch',
      users: userChanges,
    })

    await revalidateTalent(talentId)

    return { status: 'updated' }
  } catch (error) {
    logger.error('タレントのTwitch同期に失敗しました', { error, talentId })

    return { error: toErrorMessage(error), status: 'failed' }
  }
}

function toSyncResult(
  outcome: PlatformSyncOutcome,
  {
    noAccountsError,
    unchangedMessage,
  }: {
    noAccountsError: string
    unchangedMessage: string
  },
): SyncResult {
  switch (outcome.status) {
    case 'no_accounts':
      return { error: noAccountsError, success: false }
    case 'failed':
      return { error: outcome.error, success: false }
    case 'unchanged':
      return { message: unchangedMessage, success: true, unchanged: true }
    case 'updated':
      return { success: true }
  }
}

/**
 * タレントに紐づく YouTube チャンネル情報を YouTube API から同期する。
 *
 * ## 仕様
 * - **全チャンネルを同期する**: 先頭 1 件に限らず、紐づく `youtube_channels` をすべて対象にする
 * - **更新対象**: 各チャンネルの `name`（YouTube の title）と `youtube_handle`（customUrl）、
 *   およびアイコン（`snippet.thumbnails`）。アイコンは元画像が変わった場合のみ差し替える
 * - **アイコンの失敗では止めない**: アイコンの取得・保存に失敗しても、name / handle の同期は続ける
 * - **タレント名は更新しない**: `talents.name` とチャンネル名は分離されている（#5622）。
 *   バッチの `/talents/update`（`syncAccounts`）と同じ方針
 * - 単一チャンネルの場合も、チャンネルの name / handle が更新される（既存のチャンネル同期としては同等）
 */
export async function syncTalentWithYouTube(
  talentId: string,
): Promise<SyncResult> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient } = auth

  try {
    const { data: talent, error: fetchError } = await supabaseClient
      .from('talents')
      .select(
        'id, youtube_channels(id, name, youtube_channel_id, youtube_handle, profile_images(id, path, etag, source_url))',
      )
      .eq('id', talentId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!talent) {
      return { error: TALENT_NOT_FOUND_ERROR, success: false }
    }

    const outcome = await syncYouTubeChannels(
      supabaseClient,
      talent.id,
      toList(talent.youtube_channels),
    )

    return toSyncResult(outcome, {
      noAccountsError: NO_YOUTUBE_CHANNELS_ERROR,
      unchangedMessage: YOUTUBE_UNCHANGED_MESSAGE,
    })
  } catch (error) {
    logger.error('タレントの同期に失敗しました', { error, talentId })
    return { error: toErrorMessage(error), success: false }
  }
}

/**
 * タレントに紐づく Twitch ユーザー情報を Helix API から同期する。
 *
 * ## 仕様
 * - 紐づく `twitch_users` をすべて対象にする
 * - 更新対象: `name`（display_name）と `twitch_login_name`（login）
 * - タレント名は更新しない（YouTube 同期と同様）
 */
export async function syncTalentWithTwitch(
  talentId: string,
): Promise<SyncResult> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient } = auth

  try {
    const { data: talent, error: fetchError } = await supabaseClient
      .from('talents')
      .select('id, twitch_users(id, name, twitch_user_id, twitch_login_name)')
      .eq('id', talentId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!talent) {
      return { error: TALENT_NOT_FOUND_ERROR, success: false }
    }

    const outcome = await syncTwitchUsers(
      supabaseClient,
      talent.id,
      toList(talent.twitch_users),
    )

    return toSyncResult(outcome, {
      noAccountsError: NO_TWITCH_USERS_ERROR,
      unchangedMessage: TWITCH_UNCHANGED_MESSAGE,
    })
  } catch (error) {
    logger.error('タレントのTwitch同期に失敗しました', { error, talentId })
    return { error: toErrorMessage(error), success: false }
  }
}

const PLATFORM_MESSAGES = {
  twitch: {
    label: 'Twitch',
    unchanged: 'ユーザー情報は既に最新です。',
    updated: 'ユーザー情報を同期しました。',
  },
  youtube: {
    label: 'YouTube',
    unchanged: 'チャンネル情報は既に最新です。',
    updated: 'チャンネル情報を同期しました。',
  },
} as const

/**
 * タレントに紐づく YouTube チャンネルと Twitch ユーザーをまとめて同期する
 * （タレント一覧の「同期」）。
 *
 * ## 仕様
 * - 紐づいているプラットフォームだけを同期する（Twitch だけのタレントでもエラーにしない）
 * - プラットフォームごとに独立して同期し、片方が失敗してももう片方の結果は反映する
 * - 結果のメッセージにはプラットフォームごとの結果を 1 行ずつ含める。
 *   どれかが失敗した場合は `success: false` とし、`error` に同じ内容を入れる
 * - `unchanged` はどのプラットフォームも更新されなかったときに `true`
 */
export async function syncTalentAccounts(
  talentId: string,
): Promise<SyncResult> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient } = auth

  try {
    const { data: talent, error: fetchError } = await supabaseClient
      .from('talents')
      .select(
        'id, youtube_channels(id, name, youtube_channel_id, youtube_handle, profile_images(id, path, etag, source_url)), twitch_users(id, name, twitch_user_id, twitch_login_name)',
      )
      .eq('id', talentId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!talent) {
      return { error: TALENT_NOT_FOUND_ERROR, success: false }
    }

    // Each platform reports its own failure, so one cannot stop the other.
    const [youtube, twitch] = await Promise.all([
      syncYouTubeChannels(
        supabaseClient,
        talent.id,
        toList(talent.youtube_channels),
      ),
      syncTwitchUsers(supabaseClient, talent.id, toList(talent.twitch_users)),
    ])
    const outcomes = { twitch, youtube }

    const lines: string[] = []
    let hasFailure = false
    let hasUpdates = false

    for (const platform of ['youtube', 'twitch'] as const) {
      const outcome = outcomes[platform]
      const messages = PLATFORM_MESSAGES[platform]

      switch (outcome.status) {
        case 'no_accounts':
          continue
        case 'failed':
          hasFailure = true
          lines.push(`${messages.label}: 同期に失敗しました。${outcome.error}`)
          break
        case 'unchanged':
          lines.push(`${messages.label}: ${messages.unchanged}`)
          break
        case 'updated':
          hasUpdates = true
          lines.push(`${messages.label}: ${messages.updated}`)
          break
      }
    }

    if (lines.length === 0) {
      return { error: NO_ACCOUNTS_ERROR, success: false }
    }

    const text = lines.join('\n')

    return hasFailure
      ? { error: text, success: false, unchanged: !hasUpdates }
      : { message: text, success: true, unchanged: !hasUpdates }
  } catch (error) {
    logger.error('タレントの同期に失敗しました', { error, talentId })
    return { error: toErrorMessage(error), success: false }
  }
}
