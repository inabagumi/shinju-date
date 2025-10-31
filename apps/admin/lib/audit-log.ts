import type { default as Database, Tables } from '@shinju-date/database'
import { createSupabaseServerClient } from '@/lib/supabase'

export type AuditAction = Database['public']['Enums']['audit_action']

export type AuditDetails<T = unknown> = {
  changes?: {
    before?: Partial<T>
    after?: Partial<T>
  }
  entityName?: string
  // biome-ignore lint/suspicious/noExplicitAny: アクション固有の追加情報をdetailsに柔軟に格納できるようにするため
  [key: string]: any
}

type TableName = keyof Database['public']['Tables']

export async function createAuditLog<
  TDetails = never,
  TTarget extends string = string,
>(
  action: AuditAction,
  targetTable: TTarget,
  targetRecordId: string | null,
  details?: AuditDetails<
    [TDetails] extends [never]
      ? TTarget extends TableName
        ? Tables<TTarget>
        : unknown
      : TDetails
  >,
): Promise<void> {
  try {
    const supabaseClient = await createSupabaseServerClient()
    const { error } = await supabaseClient.rpc('insert_audit_log', {
      p_action: action,
      p_details: details ?? null,
      p_target_table: targetTable,
      ...(targetRecordId ? { p_target_record_id: targetRecordId } : {}),
    })

    if (error) {
      console.error('Failed to create audit log:', error)
    }
  } catch (error) {
    console.error('Error creating audit log:', error)
  }
}
