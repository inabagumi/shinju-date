import type { Database } from '@shinju-date/database'
import type { TypedSupabaseClient } from './supabase'

export type AuditAction = Database['public']['Enums']['audit_action']

export type AuditDetails = {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  [key: string]: unknown
}

export async function createAuditLog(
  supabaseClient: TypedSupabaseClient,
  action: AuditAction,
  targetTable: string,
  targetRecordId: string,
  details?: AuditDetails,
): Promise<void> {
  try {
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
