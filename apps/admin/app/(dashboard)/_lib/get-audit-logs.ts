import { createSupabaseServerClient } from '@/lib/supabase'

export type Log = Awaited<ReturnType<typeof getAuditLogs>>[number]

export async function getAuditLogs(limit = 10) {
  const supabaseClient = await createSupabaseServerClient()
  const { data: logs, error } = await supabaseClient.rpc('get_audit_logs', {
    p_limit: limit,
  })

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return logs
}
