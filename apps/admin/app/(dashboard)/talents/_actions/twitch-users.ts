'use server'

import * as z from 'zod'
import { adminAction, adminFormAction } from '@/lib/action'
import { linkAccount, unlinkAccount } from '@/lib/talent-accounts'

const addTwitchUserSchema = z.object({
  talent_id: z.string().default(''),
  twitch_user: z.string().default(''),
})

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
