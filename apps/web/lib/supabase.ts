import { type default as Database } from '@shinju-date/database'
import {
  type SupabaseClient,
  createClient as createSupabaseClient
} from '@supabase/supabase-js'

function getTags(requestInfo: RequestInfo | URL): string[] {
  const tags: string[] = []
  const { pathname } =
    requestInfo instanceof URL
      ? requestInfo
      : new URL(typeof requestInfo === 'string' ? requestInfo : requestInfo.url)

  if (pathname.startsWith('/rest/v1/rpc')) {
    const fnName = pathname.split('/').at(-1)

    if (fnName && ['search_videos', 'search_videos_v2'].includes(fnName)) {
      tags.push('videos')
    }
  } else if (pathname.startsWith('/rest/v1/')) {
    const tableName = pathname.split('/').at(-1)

    if (tableName) {
      tags.push(tableName)
    }
  }

  return tags
}

function createClient(
  url = process.env['NEXT_PUBLIC_SUPABASE_URL'],
  key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
): SupabaseClient<Database> {
  if (!url || !key) {
    throw new TypeError('Supabase URL and key are required.')
  }

  return createSupabaseClient<Database>(url, key, {
    global: {
      fetch(requestInfo, requestInit) {
        const tags = getTags(requestInfo)

        return fetch(requestInfo, {
          ...requestInit,
          next: {
            tags
          }
        })
      }
    }
  })
}

export const supabaseClient = createClient()

export async function* getAllChannels() {
  const { data, error } = await supabaseClient
    .from('channels')
    .select('id, name, slug')
    .order('created_at', {
      ascending: true
    })

  if (error) {
    throw new TypeError(error.message, { cause: error })
  }

  for (const channel of data ?? []) {
    yield channel
  }
}

export async function getChannelBySlug(slug: string) {
  const { data: channel, error } = await supabaseClient
    .from('channels')
    .select('id, name, slug')
    .eq('slug', slug)

  if (error) {
    throw new TypeError(error.message, { cause: error })
  }

  return channel[0] ?? null
}
