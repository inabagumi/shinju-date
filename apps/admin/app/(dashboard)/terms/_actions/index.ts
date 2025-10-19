'use server'

import { revalidatePath } from 'next/cache'
import type { FormState } from '@/components/form'
import { supabaseClient } from '@/lib/supabase'

export async function createTermAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const term = formData.get('term') as string
  const readings = formData.get('readings') as string
  const synonyms = formData.get('synonyms') as string

  if (!term || term.trim() === '') {
    return {
      errors: {
        term: ['用語を入力してください。'],
      },
    }
  }

  const readingsArray = readings
    ? readings
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean)
    : []
  const synonymsArray = synonyms
    ? synonyms
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  try {
    const { error } = await supabaseClient.from('terms').insert({
      readings: readingsArray,
      synonyms: synonymsArray,
      term: term.trim(),
    })

    if (error) {
      throw error
    }

    revalidatePath('/terms')
    return {}
  } catch (error) {
    console.error('Create term error:', error)
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
  const readings = formData.get('readings') as string
  const synonyms = formData.get('synonyms') as string

  if (!id || !term || term.trim() === '') {
    return {
      errors: {
        term: ['用語を入力してください。'],
      },
    }
  }

  const readingsArray = readings
    ? readings
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean)
    : []
  const synonymsArray = synonyms
    ? synonyms
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  try {
    const { error } = await supabaseClient
      .from('terms')
      .update({
        readings: readingsArray,
        synonyms: synonymsArray,
        term: term.trim(),
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/terms')
    return {}
  } catch (error) {
    console.error('Update term error:', error)
    return {
      errors: {
        generic: [
          error instanceof Error ? error.message : '用語の更新に失敗しました。',
        ],
      },
    }
  }
}

export async function deleteTermAction(id: number): Promise<{
  success: boolean
  error?: string
}> {
  if (!id) {
    return { error: 'IDが指定されていません。', success: false }
  }

  try {
    const { error } = await supabaseClient.from('terms').delete().eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/terms')
    return { success: true }
  } catch (error) {
    console.error('Delete term error:', error)
    return {
      error:
        error instanceof Error ? error.message : '用語の削除に失敗しました。',
      success: false,
    }
  }
}
