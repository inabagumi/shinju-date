import type { NextRequest } from 'next/server.js'

export function getOrigin(url: URL): string {
  const { host, protocol } = url

  return `${protocol}//${host}`
}

export function verifyOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('Origin')

  if (!origin) {
    return false
  }

  return origin === getOrigin(request.nextUrl)
}
