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

export async function addTwitchUserAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedFormState()
  }

  const talentId = String(formData.get('talent_id') ?? '')
  const input = String(formData.get('twitch_user') ?? '')

  try {
    await linkAccount('twitch', {
      input,
      supabaseClient: auth.supabaseClient,
      talentId,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof ActionError) {
      return actionErrorToFormState(error)
    }

    logger.error('Twitchユーザーの追加に失敗しました', {
      error,
      input,
      talent_id: talentId,
    })
    return {
      errors: {
        generic: [
          'Twitchユーザーの追加に失敗しました。しばらくしてから再度お試しください。',
        ],
      },
    }
  }
}

export async function removeTwitchUserAction(
  twitchUserRowId: string,
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
    await unlinkAccount('twitch', {
      accountId: twitchUserRowId,
      supabaseClient: auth.supabaseClient,
      talentId,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof ActionError) {
      return { error: error.message, success: false }
    }

    logger.error('Twitchユーザーの削除に失敗しました', {
      error,
      talent_id: talentId,
      twitch_user_row_id: twitchUserRowId,
    })
    return {
      error:
        'Twitchユーザーの削除に失敗しました。しばらくしてから再度お試しください。',
      success: false,
    }
  }
}
