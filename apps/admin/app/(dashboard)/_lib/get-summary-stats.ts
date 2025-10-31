import { createSupabaseServerClient } from '@/lib/supabase'

export type SummaryStats = {
  totalVideos: number
  visibleVideos: number
  hiddenVideos: number
  deletedVideos: number
  totalTerms: number
  totalChannels: number
}

export async function getSummaryStats(): Promise<SummaryStats> {
  const supabaseClient = await createSupabaseServerClient()

  // Get total video count (excluding deleted videos)
  const { count: totalVideos, error: totalError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  if (totalError) {
    throw new TypeError(totalError.message, {
      cause: totalError,
    })
  }

  // Get visible video count (excluding deleted videos)
  const { count: visibleVideos, error: visibleError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('visible', true)
    .is('deleted_at', null)

  if (visibleError) {
    throw new TypeError(visibleError.message, {
      cause: visibleError,
    })
  }

  // Get hidden video count (excluding deleted videos)
  const { count: hiddenVideos, error: hiddenError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('visible', false)
    .is('deleted_at', null)

  if (hiddenError) {
    throw new TypeError(hiddenError.message, {
      cause: hiddenError,
    })
  }

  // Get deleted video count
  const { count: deletedVideos, error: deletedError } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .not('deleted_at', 'is', null)

  if (deletedError) {
    throw new TypeError(deletedError.message, {
      cause: deletedError,
    })
  }

  // Get total terms count
  const { count: totalTerms, error: termsError } = await supabaseClient
    .from('terms')
    .select('*', { count: 'exact', head: true })

  if (termsError) {
    throw new TypeError(termsError.message, {
      cause: termsError,
    })
  }

  // Get total channels count
  const { count: totalChannels, error: channelsError } = await supabaseClient
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  if (channelsError) {
    throw new TypeError(channelsError.message, {
      cause: channelsError,
    })
  }

  return {
    deletedVideos: deletedVideos ?? 0,
    hiddenVideos: hiddenVideos ?? 0,
    totalChannels: totalChannels ?? 0,
    totalTerms: totalTerms ?? 0,
    totalVideos: totalVideos ?? 0,
    visibleVideos: visibleVideos ?? 0,
  }
}
