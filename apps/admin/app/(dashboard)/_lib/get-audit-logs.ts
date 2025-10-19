import { supabaseClient } from '@/lib/supabase'

export default async function getAuditLogs(limit = 10) {
  const { data: logs, error } = await supabaseClient
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return logs
}
