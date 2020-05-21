async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return res.json()
}

export default fetcher
