import type { default as Database } from '@shinju-date/database'
import retryableFetch from '@shinju-date/retryable-fetch'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

export function createSupabaseClient(
  url = process.env['NEXT_PUBLIC_SUPABASE_URL'],
  key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
): SupabaseClient<Database> {
  if (!url || !key) {
    throw new TypeError('Supabase URL and key are required.')
  }

  return createClient<Database>(url, key, {
    global: {
      fetch(requestInfo, requestInit) {
        const tags = getTags(requestInfo)
        const revalidate =
          tags.length > 0
            ? tags.some((tag) => ['announcements', 'thumbnails'].includes(tag))
              ? 60 // 1 minute
              : 60 * 60 // 1 hour
            : 0

        return retryableFetch(requestInfo, {
          ...requestInit,
          cache: 'force-cache',
          next: {
            revalidate,
            tags,
          },
        })
      },
    },
  })
}

export const supabaseClient = createSupabaseClient()
