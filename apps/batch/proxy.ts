import type { NextProxy, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { redisClient } from '@/lib/redis'

export async function proxy(
  _request: NextRequest,
): Promise<ReturnType<NextProxy>> {
  // Check for maintenance mode
  try {
    const maintenanceMode = await redisClient.get<string>('maintenance_mode')

    if (maintenanceMode === 'true') {
      // Return 503 Service Unavailable during maintenance
      return new NextResponse(
        JSON.stringify({
          error: 'Service Unavailable',
          message: 'The service is currently under maintenance.',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '3600', // Suggest retry after 1 hour
          },
          status: 503,
        },
      )
    }
  } catch (error) {
    // If Redis is unavailable, continue normally to avoid breaking cron jobs
    console.error('Failed to check maintenance mode:', error)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
