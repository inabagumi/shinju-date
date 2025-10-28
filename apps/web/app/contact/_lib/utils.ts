// Check if contact form is enabled
export function isContactFormEnabled(): boolean {
  return !!(
    process.env['RESEND_API_KEY'] &&
    process.env['FROM_EMAIL'] &&
    process.env['ADMIN_EMAIL']
  )
}
