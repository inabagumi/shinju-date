'use server'

import { adminAction, adminFormAction } from '@/lib/action'
import { linkAccount, unlinkAccount } from '@/lib/talent-accounts'
import { addTwitchUserSchema } from '../_lib/talent-schema'

export const addTwitchUserAction = adminFormAction(
  'addTwitchUserAction',
  addTwitchUserSchema,
  async ({ supabaseClient }, { talent_id, twitch_user }) => {
    await linkAccount('twitch', {
      input: twitch_user,
      supabaseClient,
      talentId: talent_id,
    })
  },
)

export const removeTwitchUserAction = adminAction(
  'removeTwitchUserAction',
  async ({ supabaseClient }, twitchUserRowId: string, talentId: string) => {
    await unlinkAccount('twitch', {
      accountId: twitchUserRowId,
      supabaseClient,
      talentId,
    })

    return { success: true }
  },
)
