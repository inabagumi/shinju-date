import { type ParsedUrlQuery } from 'querystring'

export function getQueryValue(
  key: string,
  query: ParsedUrlQuery
): string | undefined {
  const valueOrValues = query[key]

  if (!valueOrValues) {
    return undefined
  }

  const values = Array.isArray(valueOrValues) ? valueOrValues : [valueOrValues]

  return values.filter(Boolean).join(' ')
}

export function join(...paths: string[]): string {
  const pathname = paths
    .flatMap((p) => p.split('/'))
    .filter(Boolean)
    .join('/')

  return `/${pathname}`
}
