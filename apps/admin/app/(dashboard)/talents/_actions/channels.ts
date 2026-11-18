'use server'

import { adminAction, adminFormAction, parseActionInput } from '@/lib/action'
import { linkAccount, unlinkAccount } from '@/lib/talent-accounts'
import {
  addYouTubeChannelSchema,
  talentAccountIdSchema,
  talentIdSchema,
} from '../_lib/talent-schema'

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
  async ({ supabaseClient }, accountId: string, talentId: string) => {
    await unlinkAccount('youtube', {
      accountId: parseActionInput(talentAccountIdSchema, accountId),
      supabaseClient,
      talentId: parseActionInput(talentIdSchema, talentId),
    })

    return { success: true }
  },
)
