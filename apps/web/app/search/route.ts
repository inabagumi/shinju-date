export const runtime = 'edge'

export function GET(req: Request): Response {
  const basePath = '/videos'
  const nextURL = new URL(req.url)
  const queries = nextURL.searchParams.getAll('q')
  const query = queries.join(' ')

  return Response.redirect(
    new URL(
      queries.length > 0
        ? `${basePath}/${encodeURIComponent(query)}`
        : basePath,
      nextURL
    )
  )
}
