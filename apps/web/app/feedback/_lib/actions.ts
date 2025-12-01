'use server'

import type { TablesInsert } from '@shinju-date/database/default'
import { z } from 'zod'
import { createSupabaseClient } from '@/lib/supabase'

const feedbackFormSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  message: z.string().min(1, 'メッセージは必須です'),
  name: z.string().optional(),
  type: z.enum(['bug', 'feature', 'other']),
  wantsReply: z.boolean().default(false),
})

export async function submitFeedback(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Parse form data
    const rawData = {
      email: (formData.get('email') as string) || '',
      message: formData.get('message'),
      name: (formData.get('name') as string) || undefined,
      type: formData.get('type'),
      wantsReply: formData.get('wantsReply') === 'on',
    }

    // Validate with email requirement if reply is requested
    const validationSchema = rawData.wantsReply
      ? feedbackFormSchema.refine(
          (data) => data.email && data.email.length > 0,
          {
            message: '返信を希望する場合はメールアドレスが必須です',
            path: ['email'],
          },
        )
      : feedbackFormSchema

    const result = validationSchema.safeParse(rawData)

    if (!result.success) {
      return {
        error: result.error.issues.map((e) => e.message).join(', '),
        success: false,
      }
    }

    const { type, name, wantsReply, email, message } = result.data

    // Create Supabase client (anon key for public access)
    const supabase = createSupabaseClient()

    // Insert feedback into database
    const feedbackData: TablesInsert<'feedback'> = {
      email: email || null,
      message,
      name: name || null,
      type,
      wants_reply: wantsReply,
    }

    const { error: insertError } = await supabase
      .from('feedback')
      .insert(feedbackData)

    if (insertError) {
      console.error('Feedback submission error:', insertError)
      return {
        error:
          '送信中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
        success: false,
      }
    }

    return {
      message: 'フィードバックを受け付けました。ありがとうございます。',
      success: true,
    }
  } catch (error) {
    console.error('Feedback form submission error:', error)
    return {
      error:
        '送信中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
      success: false,
    }
  }
}
