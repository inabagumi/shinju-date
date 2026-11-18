import type { NextRequest } from "next/server";

import { runCronJob } from "@/lib/cron";
import { getVideosUpdateJob } from "@/lib/jobs";
import { providerQuerySchema } from "@/lib/provider";
import { parseQuery } from "@/lib/query";
import { createScraper } from "@/lib/scraper";
import { finishVideoSync } from "@/lib/video-sync";

export const maxDuration = 120;

export async function POST(request: NextRequest): Promise<Response> {
  const query = parseQuery(providerQuerySchema, request);

  if (query instanceof Response) {
    return query;
  }

  const { provider } = query;

  return runCronJob(request, getVideosUpdateJob(provider), async () => {
    const now = Temporal.Now.instant();
    const changed = await createScraper(provider).addNewVideos(now);

    await finishVideoSync({ changed, now, signal: request.signal });
  });
}

export const GET = POST;
