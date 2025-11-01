'use server'

import { logger } from '@shinju-date/logger'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
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
      .select('id, term')
      .single()

    if (error) {
      throw error
    }

    // Log audit entry
    await createAuditLog('TERM_CREATE', 'terms', newTerm.id, {
      entityName: newTerm.term,
    })

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
    const { data: newTerm, error } = await supabaseClient
      .from('terms')
      .update({
        readings: filteredReadings,
        synonyms: filteredSynonyms,
        term: term.trim(),
        updated_at: Temporal.Now.instant().toString(),
      })
      .eq('id', id)
      .select('term')
      .single()

    if (error) {
      throw error
    }

    // Log audit entry
    await createAuditLog('TERM_UPDATE', 'terms', id, {
      entityName: newTerm.term,
    })

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
    const { data: deletedTerm, error } = await supabaseClient
      .from('terms')
      .delete()
      .eq('id', id)
      .select('term')
      .single()

    if (error) {
      throw error
    }

    // Log audit entry
    await createAuditLog('TERM_DELETE', 'terms', id, {
      entityName: deletedTerm.term,
    })

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
