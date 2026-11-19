import { isMaintenanceMode } from "@shinju-date/helpers";
import type { NextProxy, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";
import { getRedisClient } from "@/lib/redis";
import { getLegacySearchRedirectPath } from "@/lib/search-redirect";

/**
 * How long the instance keeps the maintenance mode that it read. The
 * prefetches of the links on a page arrive one after another, so they share a
 * read of Redis.
 */
const MAINTENANCE_MODE_TTL = Temporal.Duration.from({ seconds: 5 });

interface MaintenanceModeCache {
  expiresAt: Temporal.Instant;
  value: Promise<boolean>;
}

let maintenanceModeCache: MaintenanceModeCache | undefined;

const getMaintenanceMode = (): Promise<boolean> => {
  const now = Temporal.Now.instant();

  if (
    maintenanceModeCache &&
    Temporal.Instant.compare(now, maintenanceModeCache.expiresAt) < 0
  ) {
    return maintenanceModeCache.value;
  }

  // Keeps the promise, so that the requests that arrive while Redis is being
  // read wait for the same read. `isMaintenanceMode` does not reject.
  const value = isMaintenanceMode(getRedisClient());

  maintenanceModeCache = {
    expiresAt: now.add(MAINTENANCE_MODE_TTL),
    value,
  };

  return value;
};

export const proxy = async (
  request: NextRequest
): Promise<ReturnType<NextProxy>> => {
  if (!serverEnv.ENABLE_MSW && (await getMaintenanceMode())) {
    // Serve static maintenance.html page
    return NextResponse.rewrite(new URL("/maintenance.html", request.url));
  }

  const searchRedirectPath = getLegacySearchRedirectPath(request.nextUrl);

  if (searchRedirectPath) {
    return Response.redirect(new URL(searchRedirectPath, request.nextUrl), 308);
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api (api endpoint)
     * - images (image routes)
     * - monitoring (Sentry tunnel)
     * - favicon.ico, sitemap.xml, robots.txt, opensearch.xml,
     *   manifest.webmanifest, icon, apple-icon (metadata files)
     * - opengraph-image (Open Graph images, at any level)
     * - paths ending with .ics (calendars) or an image extension
     * They do not show a page, so they do not read the maintenance mode.
     */
    "/((?!_next/static|_next/image|api|images/|(?:monitoring|favicon\\.ico|sitemap\\.xml|robots\\.txt|opensearch\\.xml|manifest\\.webmanifest|icon|apple-icon)$|(?:.*/)?opengraph-image$|.*\\.(?:ics|svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
