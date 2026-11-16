export function parseQueries(queries?: string[]): string {
  return queries ? queries.map(decodeURIComponent).join('/') : ''
}
