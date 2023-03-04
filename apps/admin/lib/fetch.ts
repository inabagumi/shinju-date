export default function fetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  return globalThis.fetch(input, {
    ...init,
    cache: 'no-store'
  })
}
