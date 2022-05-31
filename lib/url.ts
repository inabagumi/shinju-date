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
