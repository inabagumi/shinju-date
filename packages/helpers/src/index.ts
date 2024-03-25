type CreateErrorResponseOptions = {
  status?: number
}

export function createErrorResponse(
  message: string,
  { status = 500 }: CreateErrorResponseOptions
) {
  return Response.json({ error: message }, { status })
}

type VerifyCronRequestOptions = {
  cronSecure?: string
}

export function verifyCronRequest(
  request: Request,
  { cronSecure }: VerifyCronRequestOptions = {}
): boolean {
  if (typeof cronSecure === 'undefined') {
    return true
  }

  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return false
  }

  const [type, credentials] = authHeader
    .split(/\s+/)
    .map((value) => value.trim())

  return type === 'Bearer' && credentials === cronSecure
}
