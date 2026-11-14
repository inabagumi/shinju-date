'use server'

import type { TablesInsert } from '@shinju-date/database'
import { checkBotId } from 'botid/server'
import { z } from 'zod'
import {
  type FormState,
  getFormValues,
  toValidationErrorState,
} from '@/lib/form-state'
import { createSupabaseClient } from '@/lib/supabase'

const MESSAGE_REQUIRED_ERROR = '機能要望を入力してください'

const feedbackFormSchema = z.object({
  message: z
    .string({ error: MESSAGE_REQUIRED_ERROR })
    .trim()
    .min(1, MESSAGE_REQUIRED_ERROR),
})

type FeedbackFormField = keyof z.input<typeof feedbackFormSchema>

export type FeedbackFormState = FormState<FeedbackFormField>

const FEEDBACK_FORM_FIELDS = [
  'message',
] as const satisfies readonly FeedbackFormField[]

export async function submitFeedback(
  _prevState: unknown,
  formData: FormData,
): Promise<FeedbackFormState> {
  // Returned on failure so the form can restore what the user entered.
  const values = getFormValues(formData, FEEDBACK_FORM_FIELDS)

  try {
    // Block bots before any validation or DB write.
    // In local development, checkBotId() always returns isBot: false
    // unless developmentOptions.bypass is set.
    const verification = await checkBotId({
      advancedOptions: {
        checkLevel: 'basic',
      },
    })

    if (verification.isBot) {
      return {
        error:
          '送信を完了できませんでした。しばらく時間をおいて再度お試しください。',
        success: false,
        values,
      }
    }

    // Parse form data
    const rawData = {
      message: formData.get('message'),
    }

    const result = feedbackFormSchema.safeParse(rawData)

    if (!result.success) {
      return { ...toValidationErrorState(result.error), values }
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
        values,
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
      values,
    }
  }
}
