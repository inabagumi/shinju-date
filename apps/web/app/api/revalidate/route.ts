import { createErrorResponse } from '@shinju-date/helpers'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'

const payloadSchema = z.object({
  schema: z.string(),
  table: z.string(),
  type: z.union([z.literal('DELETE'), z.literal('INSERT'), z.literal('UPDATE')])
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
    console.error(error)

    return createErrorResponse('Unprocessable Entity', { status: 422 })
  }

  if (payload.schema !== 'public') {
    return createErrorResponse('Unprocessable Entity', {
      status: 422
    })
  }

  revalidateTag(payload.table)

  return new Response(null, { status: 204 })
}
