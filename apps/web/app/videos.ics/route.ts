import { createErrorResponse } from "@shinju-date/helpers";
import type { NextRequest } from "next/server";

import {
  hasInvalidTalentId,
  parseTalentIds,
  TALENT_SEARCH_PARAM,
} from "@/lib/talent-filter";
import {
  parseVideoKindFilter,
  VIDEO_KIND_SEARCH_PARAM,
} from "@/lib/video-kind-filter";
import { createVideosCalendarResponse } from "@/lib/videos-calendar";

/**
 * 動画のカレンダー。動画一覧と同じ `talent` と `kind` で絞り込める。
 *
 * `talent` は活動中のタレントかどうかを確かめずにそのまま使う。一致しない
 * ID を無視すると、登録済みのカレンダーがタレントの削除などをきっかけに
 * すべてのタレントの予定に変わってしまうため。
 */
export const GET = async (request: NextRequest): Promise<Response> => {
  const { searchParams } = request.nextUrl;
  const talentValues = searchParams.getAll(TALENT_SEARCH_PARAM);

  if (hasInvalidTalentId(talentValues)) {
    return createErrorResponse("Bad Request", {
      status: 400,
    });
  }

  return createVideosCalendarResponse({
    kind: parseVideoKindFilter(searchParams.getAll(VIDEO_KIND_SEARCH_PARAM)),
    talentIds: parseTalentIds(talentValues),
  });
};
