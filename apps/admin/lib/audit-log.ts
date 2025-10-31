import type { Database } from '@shinju-date/database'
import { createSupabaseServerClient } from '@/lib/supabase'

export type AuditAction = Database['public']['Enums']['audit_action']

export type AuditDetails<T> =
  | {
      before?: Partial<T>
      after?: Partial<T>
    }
  | T

export async function createAuditLog<T>(
  action: AuditAction,
  targetTable: string,
  targetRecordId: string | null,
  details?: AuditDetails<T>,
): Promise<void> {
  try {
    const supabaseClient = await createSupabaseServerClient()
    const { error } = await supabaseClient.rpc('insert_audit_log', {
      p_action: action,
      p_details: details ?? null,
      p_target_record_id: targetRecordId,
      p_target_table: targetTable,
    })

    if (error) {
      console.error('Failed to create audit log:', error)
    }
  } catch (error) {
    console.error('Error creating audit log:', error)
  }
}
