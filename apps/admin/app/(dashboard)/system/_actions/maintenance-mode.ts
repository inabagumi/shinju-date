'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { type ActionResult, adminAction } from '@/lib/action'
import { createAuditLog } from '@/lib/audit-log'
import { getRedisClient } from '@/lib/redis'

/**
 * メンテナンスモードを有効にする。一般ユーザーのアクセスはメンテナンスページに
 * 切り替わり、バッチ処理は止まる。監査ログ（`MAINTENANCE_MODE_ENABLE`）を残す。
 */
export const enableMaintenanceModeAction = adminAction(
  'enableMaintenanceModeAction',
  async ({ supabaseClient }): Promise<ActionResult> => {
    await getRedisClient().set(REDIS_KEYS.MAINTENANCE_MODE, 'true')
    await createAuditLog(supabaseClient, 'MAINTENANCE_MODE_ENABLE', null)

    return { success: true }
  },
)

/**
 * メンテナンスモードを無効にする。監査ログ（`MAINTENANCE_MODE_DISABLE`）を残す。
 */
export const disableMaintenanceModeAction = adminAction(
  'disableMaintenanceModeAction',
  async ({ supabaseClient }): Promise<ActionResult> => {
    await getRedisClient().del(REDIS_KEYS.MAINTENANCE_MODE)
    await createAuditLog(supabaseClient, 'MAINTENANCE_MODE_DISABLE', null)

    return { success: true }
  },
)
