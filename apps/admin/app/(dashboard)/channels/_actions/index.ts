'use server'

import { revalidatePath } from 'next/cache'
import type { FormState } from '@/components/form'
import { supabaseClient } from '@/lib/supabase'

export async function createChannelAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string

  if (!name || name.trim() === '') {
    return {
      errors: {
        name: ['チャンネル名を入力してください。'],
      },
    }
  }

  if (!slug || slug.trim() === '') {
    return {
      errors: {
        slug: ['チャンネルIDを入力してください。'],
      },
    }
  }

  try {
    const { error } = await supabaseClient.from('channels').insert({
      name: name.trim(),
      slug: slug.trim(),
    })

    if (error) {
      throw error
    }

    revalidatePath('/channels')
    return {}
  } catch (error) {
    console.error('Create channel error:', error)
    return {
      errors: {
        generic: [
          error instanceof Error
            ? error.message
            : 'チャンネルの追加に失敗しました。',
        ],
      },
    }
  }
}

export async function updateChannelAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const idString = formData.get('id') as string
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string

  if (!idString || !name || name.trim() === '') {
    return {
      errors: {
        name: ['チャンネル名を入力してください。'],
      },
    }
  }

  if (!slug || slug.trim() === '') {
    return {
      errors: {
        slug: ['チャンネルIDを入力してください。'],
      },
    }
  }

  const id = Number.parseInt(idString, 10)
  if (Number.isNaN(id)) {
    return {
      errors: {
        generic: ['無効なIDです。'],
      },
    }
  }

  try {
    const { error } = await supabaseClient
      .from('channels')
      .update({
        name: name.trim(),
        slug: slug.trim(),
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/channels')
    return {}
  } catch (error) {
    console.error('Update channel error:', error)
    return {
      errors: {
        generic: [
          error instanceof Error
            ? error.message
            : 'チャンネルの更新に失敗しました。',
        ],
      },
    }
  }
}

export async function deleteChannelAction(id: number): Promise<{
  success: boolean
  error?: string
}> {
  if (!id) {
    return { error: 'IDが指定されていません。', success: false }
  }

  try {
    const { error } = await supabaseClient
      .from('channels')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/channels')
    return { success: true }
  } catch (error) {
    console.error('Delete channel error:', error)
    return {
      error:
        error instanceof Error
          ? error.message
          : 'チャンネルの削除に失敗しました。',
      success: false,
    }
  }
}
