import { type LookupOneOptions } from 'node:dns'
import { resolve } from './dns.js'
import { ErrnoException } from './errors.js'
import { fetch } from './globals.js'

type LookupCallback = (
  err: ErrnoException | null,
  address: string,
  family: number
) => void

function lookup(
  hostname: string,
  _options: LookupOneOptions,
  callback: LookupCallback
) {
  resolve(hostname)
    .then((addresses) => {
      const address = addresses[Math.floor(Math.random() * addresses.length)]

      if (!address) {
        throw new TypeError(`No record match found for ${hostname}.`)
      }

      callback(null, address, 4)
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown error.'
      const exception = new ErrnoException(message)

      callback(exception, '0.0.0.0', 4)
    })
}

const readyDispatcher = import('undici')
  .then(
    ({ Agent }) =>
      new Agent({
        connect: {
          lookup
        }
      })
  )
  .catch(() => undefined)

export default async function fetchWithDNSCache(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const dispatcher = await readyDispatcher

  return fetch(input, {
    ...init,
    // @ts-expect-error for undici fetch
    dispatcher
  })
}
