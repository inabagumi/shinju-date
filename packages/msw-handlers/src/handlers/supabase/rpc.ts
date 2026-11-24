import type { Enums, Tables } from "@shinju-date/database";
import { toDBString } from "@shinju-date/temporal-fns";
import { HttpResponse } from "msw";

import {
  auditLogs,
  talents,
  terms,
  thumbnails,
  twitchUsers,
  twitchVideos,
  videos,
  youtubeVideos,
} from "../../collections.js";
import { MOCK_SUPABASE_USER } from "../../session.js";
import {
  applyOrder,
  applyPagination,
  applySupabaseConditions,
  parseSupabaseQuery,
} from "./query.js";
import { REST_URL, rest } from "./rest.js";
import { selectRows } from "./select.js";
import { videosTable } from "./tables.js";

interface GetAuditLogsParams {
  p_limit?: number;
  p_offset?: number;
  p_sort_by?: string;
  p_sort_direction?: string;
}

/**
 * Mirrors `get_audit_logs`: the audit logs with the email of the user who
 * recorded them, sorted by `created_at` or `user_email` and then newest first.
 */
const getMockAuditLogs = async ({
  p_limit: limit = 50,
  p_offset: offset = 0,
  p_sort_by: sortBy = "created_at",
  p_sort_direction: sortDirection = "desc",
}: GetAuditLogsParams) => {
  const savedLogs = await auditLogs.findMany();
  const logs = savedLogs.map((log) => ({
    ...log,
    user_email:
      log.user_id === MOCK_SUPABASE_USER.id ? MOCK_SUPABASE_USER.email : null,
  }));
  const direction = sortDirection === "asc" ? 1 : -1;

  return logs
    .toSorted((a, b) => {
      let order = 0;

      if (sortBy === "created_at") {
        order = a.created_at.localeCompare(b.created_at) * direction;
      } else if (sortBy === "user_email") {
        order =
          (a.user_email ?? "").localeCompare(b.user_email ?? "") * direction;
      }

      return order || b.created_at.localeCompare(a.created_at);
    })
    .slice(offset, offset + limit);
};

interface SearchVideosParams {
  p_perpage?: number;
  p_query?: string;
  p_talent_ids?: string[];
  p_until?: string;
  p_video_kinds?: Enums<"video_kind">[] | null;
}

/**
 * The shape this mock returns from `search_videos_v4` when no select is
 * given, with the resources of both platforms embedded.
 */
const DEFAULT_SEARCH_VIDEOS_SELECT = [
  "deleted_at",
  "duration",
  "id",
  "platform",
  "published_at",
  "status",
  "talent:talents(id,name)",
  "thumbnail:thumbnails(blur_data_url,height,id,path,width)",
  "title",
  "twitch_video:twitch_videos(twitch_video_id,type,twitch_user:twitch_users(name,twitch_login_name))",
  "updated_at",
  "video_kind",
  "visible",
  "youtube_video:youtube_videos(youtube_video_id)",
].join(",");

/**
 * Normalize text roughly like PGroonga's `NormalizerAuto`: NFKC and lower
 * case.
 */
const normalizeSearchText = (text: string): string =>
  text.normalize("NFKC").toLowerCase();

/**
 * Normalize text for a prefix search on readings (`&^~`), which also matches
 * katakana with hiragana.
 */
const normalizeReadingText = (text: string): string =>
  normalizeSearchText(text).replaceAll(/[\u30A1-\u30F6]/gu, (char) =>
    String.fromCodePoint((char.codePointAt(0) ?? 0) - 0x60)
  );

/**
 * Mirrors `pgroonga_query_expand('terms', 'synonyms', 'synonyms', query)`:
 * the query and, when a term lists it as a synonym, the other synonyms of
 * that term.
 */
const expandMockQuery = (query: string): string[] => {
  const normalizedQuery = normalizeSearchText(query);
  const expanded = new Set([normalizedQuery]);

  for (const term of terms.findMany()) {
    const synonyms = term.synonyms.map(normalizeSearchText);

    if (synonyms.includes(normalizedQuery)) {
      for (const synonym of synonyms) {
        expanded.add(synonym);
      }
    }
  }

  return [...expanded];
};

/**
 * The visible videos of the given talents and kinds whose titles contain the
 * query or one of its synonyms and that were published before `p_until`.
 */
const filterMockVideos = ({
  p_query: query = "",
  p_talent_ids: talentIds = [],
  p_until: until,
  p_video_kinds: videoKinds,
}: SearchVideosParams) => {
  const keywords = query === "" ? [] : expandMockQuery(query);

  return videos
    .findMany()
    .filter(
      (video) =>
        video.deleted_at === null &&
        video.visible &&
        (keywords.length === 0 ||
          keywords.some((keyword) =>
            normalizeSearchText(video.title).includes(keyword)
          )) &&
        (talentIds.length === 0 || talentIds.includes(video.talent_id)) &&
        (!videoKinds || videoKinds.includes(video.video_kind)) &&
        (!until || Temporal.Instant.compare(video.published_at, until) < 0)
    );
};

/**
 * The videos of `filterMockVideos` that the site shows: the ones whose talent
 * is not deleted and that the site can link to. A YouTube video needs its
 * YouTube video. A Twitch video needs its Twitch video, and either the login
 * name of its user or an ID that is not the placeholder of an archive that is
 * not ready yet (`live:{stream_id}`), unless it is a clip.
 */
const filterShownMockVideos = (params: SearchVideosParams) => {
  const matchedVideos = filterMockVideos(params);
  const visibleTalentIds = new Set(
    talents
      .findMany()
      .filter((talent) => talent.deleted_at === null)
      .map((talent) => talent.id)
  );
  const loginNames = new Map(
    twitchUsers
      .findMany()
      .map((user) => [user.id, user.twitch_login_name] as const)
  );
  const linkableYouTubeVideoIds = new Set(
    youtubeVideos
      .findMany()
      .filter((video) => video.youtube_video_id !== "")
      .map((video) => video.video_id)
  );
  const linkableTwitchVideoIds = new Set(
    twitchVideos
      .findMany()
      .filter(
        (video) =>
          !!loginNames.get(video.twitch_user_id) ||
          (video.twitch_video_id !== "" &&
            (video.type === "clip" ||
              !video.twitch_video_id.startsWith("live:")))
      )
      .map((video) => video.video_id)
  );

  return matchedVideos.filter(
    (video) =>
      visibleTalentIds.has(video.talent_id) &&
      (video.platform === "twitch"
        ? linkableTwitchVideoIds.has(video.id)
        : linkableYouTubeVideoIds.has(video.id))
  );
};

/** The first `perpage` of the given videos, newest first. */
const pageMockVideos = <T extends { published_at: string }>(
  matchedVideos: T[],
  perpage = 10
): T[] =>
  matchedVideos
    .toSorted((a, b) =>
      Temporal.Instant.compare(b.published_at, a.published_at)
    )
    .slice(0, perpage);

/**
 * Mirrors `search_videos_v4`: the videos of `filterShownMockVideos`, newest
 * first. The videos the site does not show are left out before the page size
 * is applied.
 */
const searchShownMockVideos = ({
  p_perpage: perpage,
  ...params
}: SearchVideosParams) =>
  pageMockVideos(filterShownMockVideos(params), perpage);

/** Mirrors `count_videos_v2`: the number of the videos the site shows. */
const countMockVideos = (params: SearchVideosParams) =>
  filterShownMockVideos(params).length;

interface SuggestionsParams {
  p_query?: string;
}

/** Compare two strings by their UTF-16 code units, like `Array#sort`. */
const compareCodeUnits = (a: string, b: string): number => {
  if (a < b) {
    return -1;
  }

  return a > b ? 1 : 0;
};

/**
 * Mirrors `suggestions_v2`: up to 10 terms that start with the query, then
 * those whose readings start with it, then those whose synonyms start with
 * it. The popularity of the mock terms is not used, so shorter terms come
 * first.
 */
const suggestMockTerms = ({ p_query: query = "" }: SuggestionsParams) => {
  const normalizedQuery = normalizeReadingText(query);
  const startsWithQuery = (text: string) =>
    normalizeReadingText(text).startsWith(normalizedQuery);
  const suggestions: { priority: number; term: string }[] = [];

  for (const { readings, synonyms, term } of terms.findMany()) {
    if (startsWithQuery(term)) {
      suggestions.push({ priority: 1, term });
    } else if (readings.some(startsWithQuery)) {
      suggestions.push({ priority: 2, term });
    } else if (synonyms.some(startsWithQuery)) {
      suggestions.push({ priority: 3, term });
    }
  }

  return suggestions
    .toSorted(
      (a, b) =>
        a.priority - b.priority ||
        a.term.length - b.term.length ||
        compareCodeUnits(a.term, b.term)
    )
    .slice(0, 10);
};

interface UpdateTermsPopularityParams {
  p_items?: { score?: number; term?: string }[];
}

/**
 * Mirrors `update_terms_popularity`: the number of terms matching the given
 * terms, ignoring the case. The popularity of the mock terms is not used, so
 * nothing is written.
 */
const updateMockTermsPopularity = ({
  p_items: items = [],
}: UpdateTermsPopularityParams) => {
  const givenTerms = new Set(
    items.flatMap(({ score, term }) =>
      typeof term === "string" && typeof score === "number"
        ? [term.toLowerCase()]
        : []
    )
  );

  return terms
    .findMany()
    .filter(({ term }) => givenTerms.has(term.toLowerCase())).length;
};

type VideoDeletedReason = NonNullable<Tables<"videos">["deleted_reason"]>;

interface SoftDeleteVideosParams {
  p_deleted_at: string;
  p_reason: VideoDeletedReason;
  p_video_ids: string[];
}

interface RestoreVideosParams {
  p_reason?: VideoDeletedReason | null;
  p_video_ids: string[];
}

/**
 * Set `deleted_at` of the given thumbnails, and `updated_at` as the trigger
 * of the table does. Only the thumbnails whose `deleted_at` is not yet in the
 * wanted state (deleted or not) are updated.
 */
const setMockThumbnailsDeletedAt = async (
  thumbnailIds: readonly (string | null)[],
  deletedAt: string | null
) => {
  const ids = new Set(thumbnailIds);
  const updatedAt = toDBString(Temporal.Now.instant());

  for (const thumbnail of thumbnails.findMany()) {
    if (
      ids.has(thumbnail.id) &&
      (thumbnail.deleted_at === null) !== (deletedAt === null)
    ) {
      // oxlint-disable-next-line no-await-in-loop -- the rows are written one by one, like the statements of the database function
      await thumbnails.update(thumbnail, {
        data(draft) {
          draft.deleted_at = deletedAt;
          draft.updated_at = updatedAt;
        },
      });
    }
  }
};

/**
 * Mirrors `soft_delete_videos`: soft-deletes the given videos that are not
 * deleted yet, with their thumbnails, and returns the IDs of the deleted
 * videos. The reason and the time of the videos deleted earlier are kept.
 */
const softDeleteMockVideos = async ({
  p_deleted_at: deletedAt,
  p_reason: reason,
  p_video_ids: videoIds,
}: SoftDeleteVideosParams) => {
  const ids = new Set(videoIds);
  const updatedAt = toDBString(Temporal.Now.instant());
  const targets = videos
    .findMany()
    .filter((video) => ids.has(video.id) && video.deleted_at === null)
    .toSorted((a, b) => a.id.localeCompare(b.id));

  for (const video of targets) {
    // oxlint-disable-next-line no-await-in-loop -- the rows are written one by one, like the statements of the database function
    await videos.update(video, {
      data(draft) {
        draft.deleted_at = deletedAt;
        draft.deleted_reason = reason;
        draft.updated_at = updatedAt;
      },
    });
  }

  await setMockThumbnailsDeletedAt(
    targets.map((video) => video.thumbnail_id),
    deletedAt
  );

  return targets.map((video) => video.id);
};

/**
 * Mirrors `restore_videos`: restores the given deleted videos (only those
 * deleted for `p_reason`, unless it is `null`), with their thumbnails, and
 * returns the IDs of the restored videos.
 */
const restoreMockVideos = async ({
  p_reason: reason = null,
  p_video_ids: videoIds,
}: RestoreVideosParams) => {
  const ids = new Set(videoIds);
  const updatedAt = toDBString(Temporal.Now.instant());
  const targets = videos
    .findMany()
    .filter(
      (video) =>
        ids.has(video.id) &&
        video.deleted_at !== null &&
        (reason === null || video.deleted_reason === reason)
    )
    .toSorted((a, b) => a.id.localeCompare(b.id));

  for (const video of targets) {
    // oxlint-disable-next-line no-await-in-loop -- the rows are written one by one, like the statements of the database function
    await videos.update(video, {
      data(draft) {
        draft.deleted_at = null;
        draft.deleted_reason = null;
        draft.updated_at = updatedAt;
      },
    });
  }

  await setMockThumbnailsDeletedAt(
    targets.map((video) => video.thumbnail_id),
    null
  );

  return targets.map((video) => video.id);
};

interface InsertVideoParams {
  p_platform: Tables<"videos">["platform"];
  p_platform_video: Record<string, unknown>;
  p_video: Partial<Tables<"videos">>;
}

/**
 * The columns of the platform tables that identify a video on its platform:
 * their unique constraints other than `video_id`.
 */
const PLATFORM_VIDEO_KEYS = {
  twitch: ["twitch_video_id", "stream_id"],
  youtube: ["youtube_video_id"],
} as const satisfies Record<Tables<"videos">["platform"], readonly string[]>;

/**
 * Mirrors `insert_video`: inserts the video with its platform row and
 * returns its ID, or returns `null` without inserting anything when the
 * platform video is already saved. The function sets the ID and the
 * platform of the video and the `video_id` of the platform row.
 */
const insertMockVideo = async ({
  p_platform: platform,
  p_platform_video: platformVideo,
  p_video: video,
}: InsertVideoParams): Promise<string | null> => {
  const savedRows: readonly Record<string, unknown>[] =
    platform === "twitch" ? twitchVideos.findMany() : youtubeVideos.findMany();
  const alreadySaved = PLATFORM_VIDEO_KEYS[platform].some(
    (column) =>
      platformVideo[column] !== null &&
      platformVideo[column] !== undefined &&
      savedRows.some((row) => row[column] === platformVideo[column])
  );

  if (alreadySaved) {
    return null;
  }

  const videoId = crypto.randomUUID();
  const { id: _videoId, ...videoValues } = video;
  const {
    id: _platformVideoId,
    video_id: _platformVideoVideoId,
    ...platformValues
  } = platformVideo;

  await videos.create({
    ...videosTable.defaults(),
    ...videoValues,
    id: videoId,
    platform,
  } as Tables<"videos">);

  await (platform === "twitch"
    ? twitchVideos.create({
        id: crypto.randomUUID(),
        stream_id: null,
        type: null,
        ...platformValues,
        video_id: videoId,
      } as Tables<"twitch_videos">)
    : youtubeVideos.create({
        id: crypto.randomUUID(),
        ...platformValues,
        video_id: videoId,
      } as Tables<"youtube_videos">));

  return videoId;
};

/**
 * Mirrors `touch_talent`: moves `updated_at` of the talent to the current
 * time, as the trigger of the table does, without changing anything else.
 */
const touchMockTalent = async ({
  p_talent_id: id,
}: {
  p_talent_id: string;
}) => {
  const updatedAt = toDBString(Temporal.Now.instant());

  for (const talent of talents.findMany().filter((row) => row.id === id)) {
    // oxlint-disable-next-line no-await-in-loop -- the rows are written one by one, like the statements of the database function
    await talents.update(talent, {
      data(draft) {
        draft.updated_at = updatedAt;
      },
    });
  }
};

/**
 * Mirrors `touch_thumbnail`: moves `updated_at` of the thumbnail to the
 * current time, as the trigger of the table does, without changing anything
 * else.
 */
const touchMockThumbnail = async ({
  p_thumbnail_id: id,
}: {
  p_thumbnail_id: string;
}) => {
  const updatedAt = toDBString(Temporal.Now.instant());

  for (const thumbnail of thumbnails
    .findMany()
    .filter((row) => row.id === id)) {
    // oxlint-disable-next-line no-await-in-loop -- the rows are written one by one, like the statements of the database function
    await thumbnails.update(thumbnail, {
      data(draft) {
        draft.updated_at = updatedAt;
      },
    });
  }
};

/** The handlers of the database functions (`/rest/v1/rpc/<name>`). */
export const rpcHandlers = [
  rest.post(`${REST_URL}/rpc/suggestions_v2`, async ({ request }) => {
    const body = (await request.json()) as SuggestionsParams;

    return HttpResponse.json(suggestMockTerms(body));
  }),

  rest.post(`${REST_URL}/rpc/search_videos_v4`, async ({ request }) => {
    const body = (await request.json()) as SearchVideosParams;
    const url = new URL(request.url);
    // `.rpc(...).select(...)` embeds resources and takes filters like a
    // table query, so the video rows are queried like the table.
    const query = parseSupabaseQuery(url);
    const select =
      url.searchParams.get("select") ?? DEFAULT_SEARCH_VIDEOS_SELECT;
    const selected = await selectRows(
      applySupabaseConditions(
        searchShownMockVideos(body),
        query,
        videosTable.uuidColumns
      ),
      select,
      "videos",
      query.filters
    );

    return HttpResponse.json(
      applyPagination(
        applyOrder(selected, query.order, ({ row }) => row),
        query
      ).map(({ output }) => output)
    );
  }),

  rest.post(`${REST_URL}/rpc/update_terms_popularity`, async ({ request }) => {
    const body = (await request.json()) as UpdateTermsPopularityParams;

    return HttpResponse.json(updateMockTermsPopularity(body));
  }),

  rest.post(`${REST_URL}/rpc/soft_delete_videos`, async ({ request }) => {
    const body = (await request.json()) as SoftDeleteVideosParams;

    return HttpResponse.json(await softDeleteMockVideos(body));
  }),

  rest.post(`${REST_URL}/rpc/insert_video`, async ({ request }) => {
    const body = (await request.json()) as InsertVideoParams;

    return HttpResponse.json(await insertMockVideo(body));
  }),

  rest.post(`${REST_URL}/rpc/touch_talent`, async ({ request }) => {
    await touchMockTalent((await request.json()) as { p_talent_id: string });

    return new HttpResponse(null, { status: 204 });
  }),

  rest.post(`${REST_URL}/rpc/touch_thumbnail`, async ({ request }) => {
    await touchMockThumbnail(
      (await request.json()) as { p_thumbnail_id: string }
    );

    return new HttpResponse(null, { status: 204 });
  }),

  rest.post(`${REST_URL}/rpc/restore_videos`, async ({ request }) => {
    const body = (await request.json()) as RestoreVideosParams;

    return HttpResponse.json(await restoreMockVideos(body));
  }),

  rest.post(`${REST_URL}/rpc/count_videos_v2`, async ({ request }) => {
    const body = (await request.json()) as SearchVideosParams;

    return HttpResponse.json(countMockVideos(body));
  }),

  rest.post(`${REST_URL}/rpc/get_audit_logs`, async ({ request }) => {
    const text = await request.text();
    const params = (text ? JSON.parse(text) : {}) as GetAuditLogsParams;

    return HttpResponse.json(await getMockAuditLogs(params));
  }),

  rest.post(`${REST_URL}/rpc/insert_audit_log`, async ({ request }) => {
    const params = (await request.json()) as {
      p_action: Tables<"audit_logs">["action"];
      p_details?: Tables<"audit_logs">["details"];
      p_target_record_id?: string;
      p_target_table: string;
    };

    await auditLogs.create({
      action: params.p_action,
      created_at: toDBString(Temporal.Now.instant()),
      details: params.p_details ?? null,
      id: crypto.randomUUID(),
      target_record_id: params.p_target_record_id ?? null,
      target_table: params.p_target_table,
      user_id: MOCK_SUPABASE_USER.id,
    });

    return new HttpResponse(null, { status: 204 });
  }),

  rest.post(`${REST_URL}/rpc/insert_audit_logs`, async ({ request }) => {
    const { p_entries: entries } = (await request.json()) as {
      p_entries: {
        action: Tables<"audit_logs">["action"];
        details?: Tables<"audit_logs">["details"];
        target_record_id?: string | null;
        target_table: string;
      }[];
    };
    const createdAt = toDBString(Temporal.Now.instant());

    for (const entry of entries) {
      // oxlint-disable-next-line no-await-in-loop -- the logs are inserted one by one to keep their order in the collection
      await auditLogs.create({
        action: entry.action,
        created_at: createdAt,
        details: entry.details ?? null,
        id: crypto.randomUUID(),
        target_record_id: entry.target_record_id ?? null,
        target_table: entry.target_table,
        user_id: MOCK_SUPABASE_USER.id,
      });
    }

    return new HttpResponse(null, { status: 204 });
  }),
];
