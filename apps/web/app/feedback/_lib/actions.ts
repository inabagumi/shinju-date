'use server'

import type { TablesInsert } from '@shinju-date/database'
import { z } from 'zod'
import { createSupabaseClient } from '@/lib/supabase'

const feedbackFormSchema = z.object({
  message: z.string().min(1, 'メッセージは必須です'),
})

export async function submitFeedback(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Parse form data
    const rawData = {
      message: formData.get('message'),
    }

    const result = feedbackFormSchema.safeParse(rawData)

    if (!result.success) {
      return {
        error: result.error.issues.map((e) => e.message).join(', '),
        success: false,
      }
    }

    const { message } = result.data

    // Create Supabase client (anon key for public access)
    const supabase = createSupabaseClient()

    // Insert feature request into database
    const featureRequestData: TablesInsert<'feature_requests'> = {
      message,
    }

    const { error: insertError } = await supabase
      .from('feature_requests')
      .insert(featureRequestData)

    if (insertError) {
      console.error('Feature request submission error:', insertError)
      return {
        error:
          '送信中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
        success: false,
      }
    }

    return {
      message: '機能要望を受け付けました。ありがとうございます。',
      success: true,
    }
  } catch (error) {
    console.error('Feature request form submission error:', error)
    return {
      error:
        '送信中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
      success: false,
    }
  }
}
