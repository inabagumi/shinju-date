import type { NextProxy, NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(
  request: NextRequest,
): Promise<ReturnType<NextProxy>> {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - images (image proxy routes)
     * - api (api endpoint)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|images|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
