import { serverEnv } from '@/lib/env'

/**
 * The placeholder recipient in `.env.local.sample`. Email sent to it would
 * never reach anyone, so it counts as not configured.
 */
const PLACEHOLDER_ADMIN_EMAIL = 'admin@example.com'

export interface ContactFormConfig {
  adminEmail: string
  fromEmail: string
  resendApiKey: string
}

/**
 * The settings for sending the contact form, or `null` when a submission
 * could not be delivered.
 */
export function getContactFormConfig(): ContactFormConfig | null {
  const { ADMIN_EMAIL, FROM_EMAIL, RESEND_API_KEY } = serverEnv

  if (
    !RESEND_API_KEY ||
    !FROM_EMAIL ||
    !ADMIN_EMAIL ||
    ADMIN_EMAIL === PLACEHOLDER_ADMIN_EMAIL
  ) {
    return null
  }

  return {
    adminEmail: ADMIN_EMAIL,
    fromEmail: FROM_EMAIL,
    resendApiKey: RESEND_API_KEY,
  }
}

/**
 * Whether the contact form can send email. The links to the form and the
 * form itself follow this, as does the action through
 * `getContactFormConfig()`, so the form is shown only when it can be sent.
 */
export function isContactFormEnabled(): boolean {
  return getContactFormConfig() !== null
}
