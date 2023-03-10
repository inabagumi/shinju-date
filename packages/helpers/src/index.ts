import type { NextRequest } from 'next/server.js'

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

export function verifyOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('Origin')

  if (!origin) {
    return false
  }

  return origin === getOrigin(request.nextUrl)
}
