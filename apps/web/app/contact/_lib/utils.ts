import { serverEnv } from '@/lib/env'

// Check if contact form is enabled
export function isContactFormEnabled(): boolean {
  return !!(
    serverEnv.RESEND_API_KEY &&
    serverEnv.FROM_EMAIL &&
    serverEnv.ADMIN_EMAIL
  )
}
