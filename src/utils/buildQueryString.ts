type Params = {
  count?: number | null
  q?: string | null
  since?: string | null
  until?: string | null
}

const buildQueryString = (params: Params): string => {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.append(key, value.toString())
    }
  }

  return searchParams.toString()
}

export default buildQueryString
