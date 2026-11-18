import { isMaintenanceMode } from "@shinju-date/helpers";
import type { NextProxy, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { redisClient } from "@/lib/redis";

export const proxy = async (
  request: NextRequest
): Promise<ReturnType<NextProxy>> => {
  // Allow health check endpoints during maintenance
  const pathname = request.nextUrl.pathname;
  if (pathname === "/api/healthz" || pathname === "/api/readyz") {
    return NextResponse.next();
  }

  // If Redis is unavailable, this continues normally to avoid breaking cron
  // jobs.
  if (await isMaintenanceMode(redisClient)) {
    // Return 503 Service Unavailable during maintenance
    return new NextResponse(
      JSON.stringify({
        error: "Service Unavailable",
        message: "The service is currently under maintenance.",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "3600", // Suggest retry after 1 hour
        },
        status: 503,
      }
    );
  }

  return NextResponse.next();
};

export const config = {
  matcher: "/:path*",
};
