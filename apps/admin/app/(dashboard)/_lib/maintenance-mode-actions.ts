'use server'

import { redisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'

const MAINTENANCE_MODE_KEY = 'maintenance_mode'

export async function getMaintenanceModeStatus(): Promise<boolean> {
  try {
    const value = await redisClient.get<string>(MAINTENANCE_MODE_KEY)
    return value === 'true'
  } catch (error) {
    console.error('Failed to get maintenance mode status:', error)
    return false
  }
}

export async function enableMaintenanceMode(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Set maintenance mode in Redis
    await redisClient.set(MAINTENANCE_MODE_KEY, 'true')

    // Log audit event
    const supabaseClient = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (user) {
      await supabaseClient.from('audit_logs').insert({
        action: 'MAINTENANCE_MODE_ENABLE',
        details: {
          message: 'メンテナンスモードを有効化しました',
        },
        user_id: user.id,
      })
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to enable maintenance mode:', error)
    return {
      error: 'メンテナンスモードの有効化に失敗しました。',
      success: false,
    }
  }
}

export async function disableMaintenanceMode(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Delete maintenance mode key from Redis
    await redisClient.del(MAINTENANCE_MODE_KEY)

    // Log audit event
    const supabaseClient = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (user) {
      await supabaseClient.from('audit_logs').insert({
        action: 'MAINTENANCE_MODE_DISABLE',
        details: {
          message: 'メンテナンスモードを無効化しました',
        },
        user_id: user.id,
      })
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to disable maintenance mode:', error)
    return {
      error: 'メンテナンスモードの無効化に失敗しました。',
      success: false,
    }
  }
}
