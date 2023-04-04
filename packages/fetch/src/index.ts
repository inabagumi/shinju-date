import { Agent } from './agent.js'
import { resolve } from './dns.js'
import { fetch } from './globals.js'

class ErrnoException extends Error {
  errno?: number | undefined
  code?: string | undefined
  path?: string | undefined
  syscall?: string | undefined
}

const dispatcher =
  Agent &&
  new Agent({
    connect: {
      lookup(hostname, _options, callback) {
        resolve(hostname)
          .then((addresses) => {
            const address =
              addresses[Math.floor(Math.random() * addresses.length)]

            if (!address) {
              throw new TypeError(`No record match found for ${hostname}.`)
            }

            callback(null, address, 4)
          })
          .catch((error) => {
            const message =
              error instanceof Error ? error.message : 'Unknown error.'
            const exception = new ErrnoException(message)

            callback(exception, '0.0.0.0', 0)
          })
      }
    },
    connections: 6
  })

export default function fetchWithDNSCache(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, {
    ...init,
    // @ts-expect-error for undici fetch
    dispatcher
  })
}
