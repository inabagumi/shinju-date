import type { Tables } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import { HttpResponse } from 'msw'
import {
  auditLogs,
  talents,
  terms,
  twitchVideos,
  videos,
  youtubeVideos,
} from '../../collections.js'
import { MOCK_SUPABASE_USER } from '../../session.js'
import {
  applyOrder,
  applyPagination,
  applySupabaseConditions,
  parseSupabaseQuery,
} from './query.js'
import { REST_URL, rest } from './rest.js'
import { selectRows } from './select.js'
import { videosTable } from './tables.js'

interface GetAuditLogsParams {
  p_limit?: number
  p_offset?: number
  p_sort_by?: string
  p_sort_direction?: string
}

/**
 * Mirrors `get_audit_logs`: the audit logs with the email of the user who
 * recorded them, sorted by `created_at` or `user_email` and then newest first.
 */
async function getMockAuditLogs({
  p_limit: limit = 50,
  p_offset: offset = 0,
  p_sort_by: sortBy = 'created_at',
  p_sort_direction: sortDirection = 'desc',
}: GetAuditLogsParams) {
  const logs = (await auditLogs.findMany()).map((log) => ({
    ...log,
    user_email:
      log.user_id === MOCK_SUPABASE_USER.id ? MOCK_SUPABASE_USER.email : null,
  }))
  const direction = sortDirection === 'asc' ? 1 : -1

  return logs
    .sort((a, b) => {
      const order =
        sortBy === 'created_at'
          ? a.created_at.localeCompare(b.created_at) * direction
          : sortBy === 'user_email'
            ? (a.user_email ?? '').localeCompare(b.user_email ?? '') * direction
            : 0

      return order || b.created_at.localeCompare(a.created_at)
    })
    .slice(offset, offset + limit)
}

interface SearchVideosParams {
  channel_ids?: string[]
  perpage?: number
  query?: string
  until?: string
  video_kinds?: ('short' | 'standard')[] | null
}

/**
 * The shape this mock returns from `search_videos_v2` and `search_videos_v3`
 * when no select is given, with the resources of both platforms embedded.
 */
const DEFAULT_SEARCH_VIDEOS_SELECT = [
  'deleted_at',
  'duration',
  'id',
  'platform',
  'published_at',
  'status',
  'talent:talents(id,name)',
  'thumbnail:thumbnails(blur_data_url,height,id,path,width)',
  'title',
  'twitch_video:twitch_videos(twitch_video_id,type,twitch_user:twitch_users(name,twitch_login_name))',
  'updated_at',
  'video_kind',
  'visible',
  'youtube_video:youtube_videos(youtube_video_id)',
].join(',')

/**
 * Normalize text roughly like PGroonga's `NormalizerAuto`: NFKC and lower
 * case.
 */
function normalizeSearchText(text: string): string {
  return text.normalize('NFKC').toLowerCase()
}

/**
 * Normalize text for a prefix search on readings (`&^~`), which also matches
 * katakana with hiragana.
 */
function normalizeReadingText(text: string): string {
  return normalizeSearchText(text).replace(/[\u30a1-\u30f6]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  )
}

/**
 * Mirrors `pgroonga_query_expand('terms', 'synonyms', 'synonyms', query)`:
 * the query and, when a term lists it as a synonym, the other synonyms of
 * that term.
 */
async function expandMockQuery(query: string): Promise<string[]> {
  const normalizedQuery = normalizeSearchText(query)
  const expanded = new Set([normalizedQuery])

  for (const term of terms.findMany()) {
    const synonyms = term.synonyms.map(normalizeSearchText)

    if (synonyms.includes(normalizedQuery)) {
      for (const synonym of synonyms) {
        expanded.add(synonym)
      }
    }
  }

  return [...expanded]
}

/**
 * The visible videos of the given talents and kinds whose titles contain the
 * query or one of its synonyms and that were published before `until`.
 */
async function filterMockVideos({
  channel_ids: channelIds = [],
  query = '',
  until,
  video_kinds: videoKinds,
}: SearchVideosParams) {
  const keywords = query === '' ? [] : await expandMockQuery(query)

  return videos
    .findMany()
    .filter(
      (video) =>
        video.deleted_at === null &&
        video.visible &&
        (keywords.length === 0 ||
          keywords.some((keyword) =>
            normalizeSearchText(video.title).includes(keyword),
          )) &&
        (channelIds.length === 0 || channelIds.includes(video.talent_id)) &&
        (!videoKinds || videoKinds.includes(video.video_kind)) &&
        (!until || Temporal.Instant.compare(video.published_at, until) < 0),
    )
}

/**
 * The videos of `filterMockVideos` that the site shows: the ones whose talent
 * is not deleted and that have a YouTube or Twitch video.
 */
async function filterShownMockVideos(params: SearchVideosParams) {
  const matchedVideos = await filterMockVideos(params)
  const visibleTalentIds = new Set(
    talents
      .findMany()
      .filter((talent) => talent.deleted_at === null)
      .map((talent) => talent.id),
  )
  const videoIdsWithSource = new Set(
    [...youtubeVideos.findMany(), ...twitchVideos.findMany()].map(
      (video) => video.video_id,
    ),
  )

  return matchedVideos.filter(
    (video) =>
      visibleTalentIds.has(video.talent_id) && videoIdsWithSource.has(video.id),
  )
}

/** The first `perpage` of the given videos, newest first. */
function pageMockVideos<T extends { published_at: string }>(
  matchedVideos: T[],
  perpage = 10,
): T[] {
  return matchedVideos
    .sort((a, b) => Temporal.Instant.compare(b.published_at, a.published_at))
    .slice(0, perpage)
}

/**
 * Mirrors `search_videos_v2`: the videos of `filterMockVideos`, newest first.
 * It takes no `video_kinds`, so its requests always search every kind.
 */
async function searchMockVideos({ perpage, ...params }: SearchVideosParams) {
  return pageMockVideos(await filterMockVideos(params), perpage)
}

/**
 * Mirrors `search_videos_v3`: the videos of `filterShownMockVideos`, newest
 * first. The videos the site does not show are left out before the page size
 * is applied.
 */
async function searchShownMockVideos({
  perpage,
  ...params
}: SearchVideosParams) {
  return pageMockVideos(await filterShownMockVideos(params), perpage)
}

/** Mirrors `count_videos_v1`: the number of the videos the site shows. */
async function countMockVideos(params: SearchVideosParams) {
  return (await filterShownMockVideos(params)).length
}

interface SuggestionsParams {
  p_query?: string
}

/**
 * Mirrors `suggestions_v2`: up to 10 terms that start with the query, then
 * those whose readings start with it, then those whose synonyms start with
 * it. The popularity of the mock terms is not used, so shorter terms come
 * first.
 */
async function suggestMockTerms({ p_query: query = '' }: SuggestionsParams) {
  const normalizedQuery = normalizeReadingText(query)
  const startsWithQuery = (text: string) =>
    normalizeReadingText(text).startsWith(normalizedQuery)
  const suggestions: { priority: number; term: string }[] = []

  for (const { readings, synonyms, term } of terms.findMany()) {
    if (startsWithQuery(term)) {
      suggestions.push({ priority: 1, term })
    } else if (readings.some(startsWithQuery)) {
      suggestions.push({ priority: 2, term })
    } else if (synonyms.some(startsWithQuery)) {
      suggestions.push({ priority: 3, term })
    }
  }

  return suggestions
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        a.term.length - b.term.length ||
        (a.term < b.term ? -1 : a.term > b.term ? 1 : 0),
    )
    .slice(0, 10)
}

interface UpdateTermsPopularityParams {
  p_items?: { score?: number; term?: string }[]
}

/**
 * Mirrors `update_terms_popularity`: the number of terms matching the given
 * terms, ignoring the case. The popularity of the mock terms is not used, so
 * nothing is written.
 */
async function updateMockTermsPopularity({
  p_items: items = [],
}: UpdateTermsPopularityParams) {
  const givenTerms = new Set(
    items.flatMap(({ score, term }) =>
      typeof term === 'string' && typeof score === 'number'
        ? [term.toLowerCase()]
        : [],
    ),
  )

  return terms
    .findMany()
    .filter(({ term }) => givenTerms.has(term.toLowerCase())).length
}

/** The handlers of the database functions (`/rest/v1/rpc/<name>`). */
export const rpcHandlers = [
  rest.post(`${REST_URL}/rpc/suggestions_v2`, async ({ request }) => {
    const body = (await request.json()) as SuggestionsParams

    return HttpResponse.json(await suggestMockTerms(body))
  }),

  ...(
    [
      ['search_videos_v2', searchMockVideos],
      ['search_videos_v3', searchShownMockVideos],
    ] as const
  ).map(([functionName, search]) =>
    rest.post(`${REST_URL}/rpc/${functionName}`, async ({ request }) => {
      const body = (await request.json()) as SearchVideosParams
      const url = new URL(request.url)
      // `.rpc(...).select(...)` embeds resources and takes filters like a
      // table query, so the video rows are queried like the table.
      const query = parseSupabaseQuery(url)
      const select =
        url.searchParams.get('select') ?? DEFAULT_SEARCH_VIDEOS_SELECT
      const selected = await selectRows(
        applySupabaseConditions(
          await search(body),
          query,
          videosTable.uuidColumns,
        ),
        select,
        'videos',
        query.filters,
      )

      return HttpResponse.json(
        applyPagination(
          applyOrder(selected, query.order, ({ row }) => row),
          query,
        ).map(({ output }) => output),
      )
    }),
  ),

  rest.post(`${REST_URL}/rpc/update_terms_popularity`, async ({ request }) => {
    const body = (await request.json()) as UpdateTermsPopularityParams

    return HttpResponse.json(await updateMockTermsPopularity(body))
  }),

  rest.post(`${REST_URL}/rpc/count_videos_v1`, async ({ request }) => {
    const body = (await request.json()) as SearchVideosParams

    return HttpResponse.json(await countMockVideos(body))
  }),

  rest.post(`${REST_URL}/rpc/get_audit_logs`, async ({ request }) => {
    const text = await request.text()
    const params = (text ? JSON.parse(text) : {}) as GetAuditLogsParams

    return HttpResponse.json(await getMockAuditLogs(params))
  }),

  rest.post(`${REST_URL}/rpc/insert_audit_log`, async ({ request }) => {
    const params = (await request.json()) as {
      p_action: Tables<'audit_logs'>['action']
      p_details?: Tables<'audit_logs'>['details']
      p_target_record_id?: string
      p_target_table: string
    }

    await auditLogs.create({
      action: params.p_action,
      created_at: toDBString(Temporal.Now.instant()),
      details: params.p_details ?? null,
      id: crypto.randomUUID(),
      target_record_id: params.p_target_record_id ?? null,
      target_table: params.p_target_table,
      user_id: MOCK_SUPABASE_USER.id,
    })

    return new HttpResponse(null, { status: 204 })
  }),

  rest.post(`${REST_URL}/rpc/insert_audit_logs`, async ({ request }) => {
    const { p_entries: entries } = (await request.json()) as {
      p_entries: {
        action: Tables<'audit_logs'>['action']
        details?: Tables<'audit_logs'>['details']
        target_record_id?: string | null
        target_table: string
      }[]
    }
    const createdAt = toDBString(Temporal.Now.instant())

    for (const entry of entries) {
      await auditLogs.create({
        action: entry.action,
        created_at: createdAt,
        details: entry.details ?? null,
        id: crypto.randomUUID(),
        target_record_id: entry.target_record_id ?? null,
        target_table: entry.target_table,
        user_id: MOCK_SUPABASE_USER.id,
      })
    }

    return new HttpResponse(null, { status: 204 })
  }),
]
