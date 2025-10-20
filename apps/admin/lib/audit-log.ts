import type { TypedSupabaseClient } from './supabase'

export type AuditAction =
  | 'VIDEO_DELETE'
  | 'VIDEO_VISIBILITY_TOGGLE'
  | 'TERM_CREATE'
  | 'TERM_UPDATE'
  | 'TERM_DELETE'

export async function createAuditLog(
  supabaseClient: TypedSupabaseClient,
  action: AuditAction,
  targetSlug: string | null = null,
): Promise<void> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user?.email) {
      console.error('Failed to get user for audit log:', userError)
      return
    }

    const { error } = await supabaseClient.from('audit_logs').insert({
      action,
      target_slug: targetSlug,
      user_email: user.email,
    })

    if (error) {
      console.error('Failed to create audit log:', error)
    }
  } catch (error) {
    console.error('Error creating audit log:', error)
  }
}
