import { createErrorResponse } from "@shinju-date/helpers";
import { logger } from "@shinju-date/logger";

import { fetchTalent } from "@/lib/data/talents";
import type { TalentDetail } from "@/lib/data/talents";
import { createVideosCalendarResponse } from "@/lib/videos-calendar";

export async function GET(
  _req: Request,
  {
    params,
  }: Readonly<{
    params: Promise<{
      id: string;
    }>;
  }>
): Promise<Response> {
  const { id } = await params;
  let talent: TalentDetail | null;

  try {
    talent = await fetchTalent(id);
  } catch (error) {
    logger.error("カレンダーのタレントの取得に失敗しました", {
      error,
      talentId: id,
    });

    return createErrorResponse("Internal Server Error", {
      status: 500,
    });
  }

  // Not a UUID, or a talent that does not exist or is not shown
  if (!talent) {
    return createErrorResponse("Not Found", {
      status: 404,
    });
  }

  return createVideosCalendarResponse({
    talentIds: [talent.id],
  });
}
