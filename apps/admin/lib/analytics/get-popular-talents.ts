'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import type { QueryData } from '@supabase/supabase-js'
import { cacheLife } from 'next/cache'
import {
  createSupabaseServerClient,
  type TypedSupabaseClient,
} from '@/lib/supabase'
import { _getPopularItemsFromRedis } from './_get-popular-items-from-redis'

const POPULAR_TALENT_SELECT = `
  id,
  name,
  youtube_channels (youtube_channel_id)
`

function selectPopularTalents(
  supabaseClient: TypedSupabaseClient,
  talentIds: string[],
) {
  return supabaseClient
    .from('talents')
    .select(POPULAR_TALENT_SELECT)
    .in('id', talentIds)
}

type PopularTalentRow = QueryData<
  ReturnType<typeof selectPopularTalents>
>[number]

export interface PopularTalent extends PopularTalentRow {
  clicks: number
}

/**
 * Get popular talents based on click data for a date range
 * @param limit - Number of talents to return
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD). If undefined, gets data for single date
 */
export async function getPopularTalents(
  limit: number,
  startDate: string,
  endDate?: string,
): Promise<PopularTalent[]> {
  'use cache: private'

  cacheLife('minutes')

  const talentScores = await _getPopularItemsFromRedis<string>(
    REDIS_KEYS.CLICK_CHANNEL_PREFIX,
    limit,
    Temporal.PlainDate.from(startDate),
    endDate ? Temporal.PlainDate.from(endDate) : undefined,
  )

  if (talentScores.length === 0) {
    return []
  }

  const supabaseClient = await createSupabaseServerClient()

  const talentIds = talentScores.map(([id]) => id)
  const { data: talents, error } = await selectPopularTalents(
    supabaseClient,
    talentIds,
  )

  if (error) {
    logger.error('タレントの詳細取得に失敗しました', {
      error,
      talentIds: talentIds.join(','),
    })

    return []
  }

  const talentMap = new Map(talents.map((c) => [c.id, c]))

  return talentScores
    .map(([id, clicks]) => {
      const talent = talentMap.get(id)
      if (!talent) return null

      return { ...talent, clicks }
    })
    .filter(isNonNullable)
}
