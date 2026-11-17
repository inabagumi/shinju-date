import { createErrorResponse } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { trackSearchExitWithoutClick } from '@/lib/session-analytics'
import { type Payload, payloadSchema } from './_lib/schemas'

/**
 * 検索の結果から、動画を開かずに離れたことを記録する。ページを閉じる途中でも
 * 届くように、`navigator.sendBeacon` から呼ばれる。`sendBeacon` は本文を
 * `text/plain` で送るので、`Content-Type` は確かめない。
 */
export async function POST(request: Request): Promise<Response> {
  let payload: Payload

  try {
    payload = payloadSchema.parse(await request.json())
  } catch (error) {
    logger.warn('Incorrect request received.', {
      cause: error,
    })

    return createErrorResponse('Unprocessable Entity', {
      status: 422,
    })
  }

  await trackSearchExitWithoutClick(payload.query)

  return new Response(null, {
    status: 204,
  })
}
