import { HttpResponse } from 'msw'

/**
 * A solid 256x256 PNG served as every mocked channel and user icon. Decoded
 * with `atob` rather than `Buffer`, because the handlers are also loaded by
 * the browser worker.
 */
const MOCK_ICON_PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAAA1BMVEVPRuWq/wlTAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAVElEQVR42u3BAQEAAACAkP6v7ggKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAEPAAEccgnDAAAAAElFTkSuQmCC',
  ),
  (character) => character.charCodeAt(0),
)

/**
 * Answers an icon download like a platform CDN. Every icon is the same
 * image, so the ETag only depends on `key` (e.g. the file name); a
 * conditional request with a matching ETag gets `304 Not Modified`.
 */
export function createIconResponse(request: Request, key: string): Response {
  const etag = `"${key}"`
  const headers = { 'Content-Type': 'image/png', ETag: etag }

  if (request.headers.get('If-None-Match') === etag) {
    return new HttpResponse(null, { headers, status: 304 })
  }

  return new HttpResponse(MOCK_ICON_PNG, { headers })
}
