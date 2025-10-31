'use server'

import { logger } from '@shinju-date/logger'
import { revalidatePath } from 'next/cache'
import type { FormState } from '@/components/form'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function createTermAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const term = formData.get('term') as string

  if (!term || term.trim() === '') {
    return {
      errors: {
        term: ['用語を入力してください。'],
      },
    }
  }

  // Extract array values from FormData
  const readingsArray: string[] = []
  const synonymsArray: string[] = []

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('readings[') && typeof value === 'string') {
      readingsArray.push(value)
    } else if (key.startsWith('synonyms[') && typeof value === 'string') {
      synonymsArray.push(value)
    }
  }

  // Filter out empty values
  const filteredReadings = readingsArray.map((r) => r.trim()).filter(Boolean)
  const filteredSynonyms = synonymsArray.map((s) => s.trim()).filter(Boolean)

  const supabaseClient = await createSupabaseServerClient()

  try {
    const { data: newTerm, error } = await supabaseClient
      .from('terms')
      .insert({
        readings: filteredReadings,
        synonyms: filteredSynonyms,
        term: term.trim(),
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    // Log audit entry
    await createAuditLog(supabaseClient, 'TERM_CREATE', String(newTerm.id))

    revalidatePath('/terms')
    return {}
  } catch (error) {
    logger.error('用語の追加に失敗しました', { error, term: term.trim() })
    return {
      errors: {
        generic: [
          error instanceof Error ? error.message : '用語の追加に失敗しました。',
        ],
      },
    }
  }
}

export async function updateTermAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = formData.get('id') as string
  const term = formData.get('term') as string

  if (!id || !term || term.trim() === '') {
    return {
      errors: {
        term: ['用語を入力してください。'],
      },
    }
  }

  // Extract array values from FormData
  const readingsArray: string[] = []
  const synonymsArray: string[] = []

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('readings[') && typeof value === 'string') {
      readingsArray.push(value)
    } else if (key.startsWith('synonyms[') && typeof value === 'string') {
      synonymsArray.push(value)
    }
  }

  // Filter out empty values
  const filteredReadings = readingsArray.map((r) => r.trim()).filter(Boolean)
  const filteredSynonyms = synonymsArray.map((s) => s.trim()).filter(Boolean)

  const supabaseClient = await createSupabaseServerClient()

  try {
    const { error } = await supabaseClient
      .from('terms')
      .update({
        readings: filteredReadings,
        synonyms: filteredSynonyms,
        term: term.trim(),
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    // Log audit entry
    await createAuditLog(supabaseClient, 'TERM_UPDATE', id)

    revalidatePath('/terms')
    return {}
  } catch (error) {
    logger.error('用語の更新に失敗しました', { error, id, term: term.trim() })
    return {
      errors: {
        generic: [
          error instanceof Error ? error.message : '用語の更新に失敗しました。',
        ],
      },
    }
  }
}

export async function deleteTermAction(id: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!id) {
    return { error: 'IDが指定されていません。', success: false }
  }

  const supabaseClient = await createSupabaseServerClient()

  try {
    const { error } = await supabaseClient.from('terms').delete().eq('id', id)

    if (error) {
      throw error
    }

    // Log audit entry
    await createAuditLog(supabaseClient, 'TERM_DELETE', id)

    revalidatePath('/terms')
    return { success: true }
  } catch (error) {
    logger.error('用語の削除に失敗しました', { error, id })
    return {
      error:
        error instanceof Error ? error.message : '用語の削除に失敗しました。',
      success: false,
    }
  }
}
