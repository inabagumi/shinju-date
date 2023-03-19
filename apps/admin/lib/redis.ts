import { type Temporal } from '@js-temporal/polyfill'
import {
  Redis,
  type Requester,
  type UpstashRequest,
  type UpstashResponse
} from '@upstash/redis'

export async function isDuplicate(key: string, duration: Temporal.Duration) {
  const response = await redisClient.set(key, true, {
    ex: duration.total({ unit: 'second' }),
    nx: true
  })

  return !response
}

export class HTTPClient implements Requester {
  #baseURL: string
  #token: string

  constructor() {
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      throw new TypeError('The base URL and token are required')
    }

    this.#baseURL = process.env.UPSTASH_REDIS_REST_URL
    this.#token = process.env.UPSTASH_REDIS_REST_TOKEN
  }

  async request<TResult = unknown>(
    req: UpstashRequest
  ): Promise<UpstashResponse<TResult>> {
    const url = [this.#baseURL, ...(req.path ?? [])].join('/')

    let res: Response | null = null
    let err: Error | null = null
    try {
      res = await fetch(url, {
        body: JSON.stringify(req.body),
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${this.#token}`,
          'Content-Type': 'application/json'
        },
        keepalive: true,
        method: 'POST',
        next: {
          revalidate: 0
        }
      })
    } catch (error) {
      err = error instanceof Error ? error : new Error()
    }

    if (!res) {
      throw err ?? new Error()
    }

    const body = (await res.json()) as UpstashResponse<TResult>

    if (!res.ok) {
      throw new TypeError(body.error)
    }

    return body
  }
}

export const redisClient = new Redis(new HTTPClient())
