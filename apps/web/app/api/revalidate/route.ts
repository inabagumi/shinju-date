import { captureException } from '@sentry/nextjs'
import { createErrorResponse } from '@shinju-date/helpers'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'

const payloadSchema = z.object({
  tags: z.array(z.string())
})

async function parseRequest(
  request: Request
): Promise<z.infer<typeof payloadSchema>> {
  const rawPayload = (await request.json()) as unknown

  return payloadSchema.parse(rawPayload)
}

export async function POST(request: Request): Promise<Response> {
  let payload: Awaited<ReturnType<typeof parseRequest>>

  try {
    payload = await parseRequest(request)
  } catch (error) {
    captureException(error)

    return createErrorResponse('Unprocessable Entity', { status: 422 })
  }

  if (payload.tags.length < 1) {
    return createErrorResponse('Unprocessable Entity', { status: 422 })
  }

  for (const tag of payload.tags) {
    revalidateTag(tag)
  }

  return new Response(null, { status: 204 })
}
