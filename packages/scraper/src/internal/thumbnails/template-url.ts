/** Default dimensions when the source only provides a template URL (e.g. Twitch). */
export const DEFAULT_THUMBNAIL_WIDTH = 1280
export const DEFAULT_THUMBNAIL_HEIGHT = 720

/**
 * Resolves Twitch (and similar) thumbnail template URLs that use
 * `%{width}x%{height}` or `{width}x{height}` placeholders.
 */
export function resolveThumbnailTemplateUrl(
  url: string,
  width = DEFAULT_THUMBNAIL_WIDTH,
  height = DEFAULT_THUMBNAIL_HEIGHT,
): string {
  return url
    .replaceAll('%{width}', String(width))
    .replaceAll('%{height}', String(height))
    .replaceAll('{width}', String(width))
    .replaceAll('{height}', String(height))
}
