type CreateErrorResponseOptions = {
  status?: number
}

export function createErrorResponse(
  message: string,
  { status = 500 }: CreateErrorResponseOptions
) {
  return Response.json(
    { error: message },
    {
      headers: {
        'Cache-Control': 'no-store'
      },
      status
    }
  )
}

type VerifyCronRequestOptions = {
  cronSecure: string
}

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && typeof value !== 'undefined'
}

export function verifyCronRequest(
  request: Request,
  { cronSecure }: VerifyCronRequestOptions
): boolean {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return false
  }

  const [type, credentials] = authHeader
    .split(/\s+/)
    .map((value) => value.trim())

  return type === 'Bearer' && credentials === cronSecure
}
