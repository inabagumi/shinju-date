import { registerOTel } from '@vercel/otel'

export function register() {
  registerOTel({ serviceName: 'shinju-date-admin' })
}
