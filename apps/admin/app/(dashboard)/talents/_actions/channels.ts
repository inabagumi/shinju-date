'use server'

import { logger } from '@shinju-date/logger'
import type { FormState } from '@/components/form'
import { ActionError } from '@/lib/action'
import {
  requireAuthenticatedUser,
  unauthenticatedFormState,
  unauthenticatedResult,
} from '@/lib/auth'
import { actionErrorToFormState } from '@/lib/form'
import { linkAccount, unlinkAccount } from '@/lib/talent-accounts'

export async function addYouTubeChannelAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedFormState()
  }

  const talentId = String(formData.get('talent_id') ?? '')
  const input = String(formData.get('youtube_channel_id') ?? '')

  try {
    await linkAccount('youtube', {
      input,
      supabaseClient: auth.supabaseClient,
      talentId,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof ActionError) {
      return actionErrorToFormState(error)
    }

    logger.error('YouTubeチャンネルの追加に失敗しました', {
      error,
      input,
      talent_id: talentId,
    })
    return {
      errors: {
        generic: [
          error instanceof Error
            ? error.message
            : 'YouTubeチャンネルの追加に失敗しました。',
        ],
      },
    }
  }
}

export async function removeYouTubeChannelAction(
  channelId: string,
  talentId: string,
): Promise<{
  success: boolean
  error?: string
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  try {
    await unlinkAccount('youtube', {
      accountId: channelId,
      supabaseClient: auth.supabaseClient,
      talentId,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof ActionError) {
      return { error: error.message, success: false }
    }

    logger.error('YouTubeチャンネルの削除に失敗しました', {
      channel_id: channelId,
      error,
      talent_id: talentId,
    })
    return {
      error:
        error instanceof Error
          ? error.message
          : 'YouTubeチャンネルの削除に失敗しました。',
      success: false,
    }
  }
}
