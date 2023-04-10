import { LRUCache } from 'lru-cache'
import pLimit from 'p-limit'
import * as yup from 'yup'
import { fetch } from './globals.js'

const DEFAULT_DNS_OVER_HTTPS_URL = 'https://1.1.1.1/dns-query'
const DNS_OVER_HTTPS_URLS = [
  DEFAULT_DNS_OVER_HTTPS_URL,
  'https://8.8.8.8/resolve'
] as const

const dnsResponseSchema = yup.object({
  AD: yup.boolean().required(),
  Answer: yup.array().of(
    yup.object({
      TTL: yup.number(),
      data: yup.string().required(),
      name: yup.string().required(),
      type: yup.number().max(65535).min(0).required()
    })
  ),
  Authority: yup.object({
    TTL: yup.number().required(),
    data: yup.string().required(),
    name: yup.string().required(),
    type: yup.number().max(65535).min(0).required()
  }),
  CD: yup.boolean().required(),
  Comment: yup.string(),
  Question: yup.array().of(
    yup.object({
      name: yup.string().required(),
      type: yup.number().max(65535).min(0).required()
    })
  ),
  RA: yup.boolean().required(),
  RD: yup.boolean().required(),
  Status: yup.number().max(65535).min(0).required(),
  TC: yup.boolean().required()
})

type DNSResponse = yup.InferType<typeof dnsResponseSchema>

type DoHURLParams = {
  name: string
  type?: 'A' | 'AAAA'
}

function buildDoHURL({ name, type = 'A' }: DoHURLParams): URL {
  const baseURL =
    DNS_OVER_HTTPS_URLS[
      Math.floor(Math.random() * DNS_OVER_HTTPS_URLS.length)
    ] ?? DEFAULT_DNS_OVER_HTTPS_URL
  const dohURL = new URL(baseURL)

  dohURL.searchParams.set('name', name)
  dohURL.searchParams.set('type', type)

  return dohURL
}

type RequestDoHOptions = {
  ipv6?: boolean
}

async function requestDoH(
  hostname: string,
  { ipv6 = false }: RequestDoHOptions = {}
): Promise<DNSResponse> {
  const dohURL = buildDoHURL({ name: hostname, type: ipv6 ? 'AAAA' : 'A' })
  const res = await fetch(dohURL, {
    headers: {
      Accept: 'application/dns-json'
    }
  })

  if (!res.ok) {
    throw new TypeError(`${res.status} ${res.statusText}: ${dohURL.toString()}`)
  }

  const maybeDNSResponse = (await res.json()) as unknown

  return dnsResponseSchema.validate(maybeDNSResponse, { strict: true })
}

const limit = pLimit(1)

const cache = new LRUCache<string, string[]>({
  max: 100
})

type ResolveOptions = {
  ipv6?: boolean
}

export function resolve(
  hostname: string,
  { ipv6 = false }: ResolveOptions = {}
): Promise<string[]> {
  return limit(async () => {
    const cacheKey = ipv6 ? `ipv6:${hostname}` : `ipv4:${hostname}`
    const cachedAddresses = cache.get(cacheKey)

    if (cachedAddresses) {
      return cachedAddresses
    }

    const dnsResponse = await requestDoH(hostname, { ipv6 })

    if (dnsResponse.Status !== 0) {
      throw new TypeError(dnsResponse.Comment ?? `Unknown error: ${hostname}`)
    }

    if (!dnsResponse.Answer || dnsResponse.Answer.length < 1) {
      return []
    }

    const records = dnsResponse.Answer.filter(
      (record) => record.type === (ipv6 ? 28 : 1)
    )
    const addresses = records.map((record) => record.data)
    const minimumTTL = records
      .map((record) => record.TTL ?? 0)
      .reduce(
        (previousTTL, currentTTL) => Math.min(previousTTL, currentTTL),
        1200
      )

    if (minimumTTL > 0) {
      cache.set(cacheKey, addresses, {
        ttl: minimumTTL * 1_000
      })
    }

    return addresses
  })
}
