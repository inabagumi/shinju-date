'use server'

import * as z from 'zod'
import { adminAction, adminFormAction } from '@/lib/action'
import { linkAccount, unlinkAccount } from '@/lib/talent-accounts'

const addYouTubeChannelSchema = z.object({
  talent_id: z.string().default(''),
  youtube_channel_id: z.string().default(''),
})

export const addYouTubeChannelAction = adminFormAction(
  'addYouTubeChannelAction',
  addYouTubeChannelSchema,
  async ({ supabaseClient }, { talent_id, youtube_channel_id }) => {
    await linkAccount('youtube', {
      input: youtube_channel_id,
      supabaseClient,
      talentId: talent_id,
    })
  },
)

export const removeYouTubeChannelAction = adminAction(
  'removeYouTubeChannelAction',
  async ({ supabaseClient }, channelId: string, talentId: string) => {
    await unlinkAccount('youtube', {
      accountId: channelId,
      supabaseClient,
      talentId,
    })

    return { success: true }
  },
)
