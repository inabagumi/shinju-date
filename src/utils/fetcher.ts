import { parseJSON } from 'date-fns'

function reviver<T>(key: string, value: T): T | Date {
  return key.endsWith('At') && typeof value === 'string'
    ? parseJSON(value)
    : value
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const body = await res.text()

  return JSON.parse(body, reviver)
}

export default fetcher
