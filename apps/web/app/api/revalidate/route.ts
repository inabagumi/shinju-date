import { createErrorResponse } from '@shinju-date/helpers'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'

export const runtime = 'edge'

const payloadSchema = z.object({
  tags: z.string().min(1).array().nonempty()
})

async function parseRequest(
  request: Request
): Promise<z.infer<typeof payloadSchema>> {
  const rawPayload = (await request.json()) as unknown

  return payloadSchema.parse(rawPayload)
}

export async function POST(request: Request): Promise<Response> {
  let payload: z.infer<typeof payloadSchema>

  try {
    payload = await parseRequest(request)
  } catch (error) {
    console.error(error)

    return createErrorResponse('Unprocessable Entity', { status: 422 })
  }

  for (const tag of payload.tags) {
    revalidateTag(tag)
  }

  console.log(JSON.stringify({ revalidated: 'success', tags: payload.tags }))

  return new Response(null, { status: 204 })
}
