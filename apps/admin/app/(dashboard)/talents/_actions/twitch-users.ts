'use server'

import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import {
  parseTwitchUserIdentifier,
  resolveTwitchUser,
} from '@shinju-date/twitch-api-client'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import type { FormState } from '@/components/form'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

function twitchApiErrorFormState(error: unknown): FormState {
  if (
    error instanceof TypeError &&
    error.message.includes('Client ID and Client Secret')
  ) {
    return {
      errors: {
        generic: [
          'Twitch APIの認証情報が設定されていません。管理者に連絡してください。',
        ],
      },
    }
  }

  logger.error('Twitch APIの呼び出しに失敗しました', { error })
  return {
    errors: {
      generic: [
        'Twitch APIへの接続に失敗しました。しばらくしてから再度お試しください。',
      ],
    },
  }
}

export async function addTwitchUserAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabaseClient = await createSupabaseServerClient()

  const talentId = formData.get('talent_id') as string
  const rawInput = (formData.get('twitch_user') as string) ?? ''

  if (!talentId) {
    return {
      errors: {
        generic: ['タレントIDが指定されていません。'],
      },
    }
  }

  if (!rawInput.trim()) {
    return {
      errors: {
        twitch_user: [
          'Twitchのログイン名、ユーザーID、またはURLを入力してください。',
        ],
      },
    }
  }

  const identifier = parseTwitchUserIdentifier(rawInput)
  if (!identifier) {
    return {
      errors: {
        twitch_user: [
          '有効なログイン名、ユーザーID（数字）、またはTwitch URLを入力してください。',
        ],
      },
    }
  }

  let twitchUser: Awaited<ReturnType<typeof resolveTwitchUser>>
  try {
    twitchUser = await resolveTwitchUser(identifier)
  } catch (error) {
    return twitchApiErrorFormState(error)
  }

  if (!twitchUser) {
    return {
      errors: {
        twitch_user: [
          'Twitchでユーザーが見つかりませんでした。入力内容を確認してください。',
        ],
      },
    }
  }

  const twitchUserId = twitchUser.id
  const loginName = twitchUser.login
  const displayName = twitchUser.display_name

  try {
    // Unique across all talents (twitch_user_id has a global unique constraint)
    const { data: existingUser } = await supabaseClient
      .from('twitch_users')
      .select('id, talent_id')
      .eq('twitch_user_id', twitchUserId)
      .maybeSingle()

    if (existingUser) {
      if (existingUser.talent_id === talentId) {
        return {
          errors: {
            twitch_user: ['このTwitchユーザーは既に登録されています。'],
          },
        }
      }
      return {
        errors: {
          twitch_user: [
            'このTwitchユーザーは別のタレントに既に登録されています。',
          ],
        },
      }
    }

    const { data: newUser, error } = await supabaseClient
      .from('twitch_users')
      .insert({
        name: displayName,
        talent_id: talentId,
        twitch_login_name: loginName,
        twitch_user_id: twitchUserId,
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    await supabaseClient
      .from('talents')
      .update({
        updated_at: toDBString(Temporal.Now.instant()),
      })
      .eq('id', talentId)

    await createAuditLog('TWITCH_USER_CREATE', 'twitch_users', newUser.id, {
      name: displayName,
      talent_id: talentId,
      twitch_login_name: loginName,
      twitch_user_id: twitchUserId,
    })

    revalidatePath(`/talents/${talentId}`)
    revalidatePath('/talents')
    await revalidateTags(['talents', 'videos'])

    return { success: true }
  } catch (error) {
    logger.error('Twitchユーザーの追加に失敗しました', {
      error,
      talent_id: talentId,
      twitch_user_id: twitchUserId,
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
  const supabaseClient = await createSupabaseServerClient()

  if (!twitchUserRowId || !talentId) {
    return {
      error: 'TwitchユーザーIDまたはタレントIDが指定されていません。',
      success: false,
    }
  }

  try {
    const { data: user, error: fetchError } = await supabaseClient
      .from('twitch_users')
      .select('twitch_user_id, twitch_login_name')
      .eq('id', twitchUserRowId)
      .eq('talent_id', talentId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        logger.warn('削除対象のTwitchユーザーが見つかりませんでした', {
          talent_id: talentId,
          twitch_user_row_id: twitchUserRowId,
        })
        return {
          error:
            '指定されたTwitchユーザーが見つかりません。既に削除されているか、存在しないIDが指定されています。',
          success: false,
        }
      }
      throw fetchError
    }

    const { error } = await supabaseClient
      .from('twitch_users')
      .delete()
      .eq('id', twitchUserRowId)
      .eq('talent_id', talentId)

    if (error) {
      throw error
    }

    await supabaseClient
      .from('talents')
      .update({
        updated_at: toDBString(Temporal.Now.instant()),
      })
      .eq('id', talentId)

    await createAuditLog(
      'TWITCH_USER_DELETE',
      'twitch_users',
      twitchUserRowId,
      {
        talent_id: talentId,
        twitch_login_name: user.twitch_login_name,
        twitch_user_id: user.twitch_user_id,
      },
    )

    revalidatePath(`/talents/${talentId}`)
    revalidatePath('/talents')
    await revalidateTags(['talents', 'videos'])

    return { success: true }
  } catch (error) {
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
