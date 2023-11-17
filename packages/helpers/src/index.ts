export function getOrigin(url: URL): string {
  const { host, protocol } = url

  return `${protocol}//${host}`
}

export function normalizePath(pathname?: string): string {
  if (pathname) {
    const baseURL = new URL('https://shinju-date.test/')
    const newURL = new URL(pathname, baseURL)

    if (baseURL.host === newURL.host) {
      return newURL.pathname
    }
  }

  return '/'
}

export function verifyCronRequest(
  request: Request,
  { cronSecure }: { cronSecure?: string } = {}
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

export function verifyOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')

  if (!origin) {
    return false
  }

  const nextURL = new URL(request.url)

  return origin === getOrigin(nextURL)
}
