import { REDIS_KEYS } from '@shinju-date/constants'
import type { NextProxy, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getRedisClient } from '@/lib/redis'
import { getLegacySearchRedirectPath } from '@/lib/search-redirect'

async function handleMaintenanceMode(
  request: NextRequest,
): Promise<NextResponse | undefined> {
  try {
    const redisClient = getRedisClient()
    const maintenanceMode = await redisClient.get<boolean>(
      REDIS_KEYS.MAINTENANCE_MODE,
    )

    if (maintenanceMode === true) {
      // Serve static maintenance.html page
      return NextResponse.rewrite(new URL('/maintenance.html', request.url))
    }
  } catch (error) {
    // If Redis is unavailable, continue normally
    console.error('Failed to check maintenance mode:', error)
  }

  return undefined
}

export async function proxy(
  request: NextRequest,
): Promise<ReturnType<NextProxy>> {
  if (process.env['ENABLE_MSW'] !== 'true') {
    const maintenanceResponse = await handleMaintenanceMode(request)

    if (maintenanceResponse) {
      return maintenanceResponse
    }
  }

  const searchRedirectPath = getLegacySearchRedirectPath(request.nextUrl)

  if (searchRedirectPath) {
    return Response.redirect(new URL(searchRedirectPath, request.nextUrl), 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api (api endpoint)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
