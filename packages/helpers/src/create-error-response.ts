interface CreateErrorResponseOptions {
  status?: number
}

export function createErrorResponse(
  message: string,
  { status = 500 }: CreateErrorResponseOptions,
) {
  return Response.json(
    {
      error: message,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
      status,
    },
  )
}
