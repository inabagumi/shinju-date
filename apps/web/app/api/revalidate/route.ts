import { createErrorResponse } from '@shinju-date/helpers'
import { defaultLogger as logger } from '@shinju-date/logging'
import { revalidateTag } from 'next/cache'
import { type Payload, payloadSchema } from './_lib/schemas'

export const runtime = 'edge'

async function parseRequest(request: Request): Promise<Payload> {
  const rawPayload = (await request.json()) as unknown

  return payloadSchema.parse(rawPayload)
}

export async function POST(request: Request): Promise<Response> {
  let payload: Payload

  try {
    payload = await parseRequest(request)
  } catch (error) {
    console.error(error)

    return createErrorResponse('Unprocessable Entity', { status: 422 })
  }

  for (const tag of payload.tags) {
    revalidateTag(tag)
  }

  logger.info('Revalidation was successful.', {
    tags: payload.tags
  })

  return new Response(null, { status: 204 })
}
