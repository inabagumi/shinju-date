import type { H3Event } from 'h3'

/**
 * Verify cron request authorization
 * Throws error if unauthorized
 */
export function verifyCronAuth(event: H3Event): void {
  const cronSecure = process.env['CRON_SECRET']
  if (!cronSecure) {
    return // Skip verification if CRON_SECRET is not set
  }

  // Convert H3 event to Web Request for compatibility with existing helper
  const request = event.node.req

  const authHeader = request.headers['authorization']
  if (!authHeader) {
    throw createError({
      message: 'Unauthorized',
      statusCode: 401,
    })
  }

  const [type, credentials] = authHeader
    .split(/\s+/)
    .map((value) => value.trim())

  if (type !== 'Bearer' || credentials !== cronSecure) {
    throw createError({
      message: 'Unauthorized',
      statusCode: 401,
    })
  }
}
