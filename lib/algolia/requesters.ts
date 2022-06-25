import {
  type Request,
  type Requester,
  type Response
} from '@algolia/requester-common'

function isAbortError(error: unknown): boolean {
  return (
    // browser fetch
    (error instanceof DOMException && error.name === 'AbortError') ||
    // node-fetch or undici
    (error instanceof Error && error.name === 'AbortError')
  )
}

function genericError(error: unknown, abortContent: string): Response {
  const isTimedOut = isAbortError(error)
  const content = isTimedOut
    ? abortContent
    : error instanceof Error
    ? error.message
    : 'Network request failed'

  return {
    content,
    isTimedOut,
    status: 0
  }
}

export function createFetchRequester(): Requester {
  return {
    async send(request: Request): Promise<Readonly<Response>> {
      const abortController = new AbortController()
      const signal = abortController.signal

      const createTimeout = (timeout: number): NodeJS.Timeout => {
        return setTimeout(() => {
          abortController.abort()
        }, timeout * 1000)
      }

      const connectTimeout = createTimeout(request.connectTimeout)

      let fetchRes: globalThis.Response
      try {
        fetchRes = await fetch(request.url, {
          body: request.data,
          headers: request.headers,
          method: request.method,
          signal
        })
      } catch (error) {
        return genericError(error, 'Connection timeout')
      } finally {
        clearTimeout(connectTimeout)
      }

      const responseTimeout = createTimeout(request.responseTimeout)

      let content: string
      try {
        content = await fetchRes.text()
      } catch (error) {
        return genericError(error, 'Socket timeout')
      } finally {
        clearTimeout(responseTimeout)
      }

      return {
        content,
        isTimedOut: false,
        status: fetchRes.status
      }
    }
  }
}
