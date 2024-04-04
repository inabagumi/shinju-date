import { captureException as captureExceptionImpl } from '@sentry/nextjs'

export function captureException(error: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    captureExceptionImpl(error)
  } else {
    console.error(error)
  }
}
