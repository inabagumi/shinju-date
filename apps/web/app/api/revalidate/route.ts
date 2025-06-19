import * as Sentry from '@sentry/nextjs'
import { createErrorResponse } from '@shinju-date/helpers'
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
    Sentry.logger.warn('Incorrect request received.', {
      cause: error
    })

    return createErrorResponse('Unprocessable Entity', { status: 422 })
  }

  for (const tag of payload.tags) {
    revalidateTag(tag)
  }

  Sentry.logger.info('Revalidation was successful.', {
    tags: payload.tags
  })

  return new Response(null, { status: 204 })
}
