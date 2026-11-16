'use server'

import { checkBotId } from 'botid/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { serverEnv } from '@/lib/env'
import {
  type FormState,
  getFormValues,
  toValidationErrorState,
} from '@/lib/form-state'
import { isContactFormEnabled } from './utils'

const MESSAGE_REQUIRED_ERROR = 'お問い合わせ内容を入力してください'

const contactFormSchema = z.object({
  email: z
    .email({ error: 'メールアドレスの形式が正しくありません' })
    .optional(),
  message: z
    .string({ error: MESSAGE_REQUIRED_ERROR })
    .trim()
    .min(1, MESSAGE_REQUIRED_ERROR),
  name: z.string().optional(),
  type: z.enum(['bug', 'feature', 'other'], {
    error: 'お問い合わせ種別を選択してください',
  }),
  wantsReply: z.boolean().default(false),
})

type ContactFormField = keyof z.input<typeof contactFormSchema>

export type ContactFormState = FormState<ContactFormField>

const CONTACT_FORM_FIELDS = [
  'email',
  'message',
  'name',
  'type',
  'wantsReply',
] as const satisfies readonly ContactFormField[]

// Only initialize Resend if API key is available
const resend = serverEnv.RESEND_API_KEY
  ? new Resend(serverEnv.RESEND_API_KEY)
  : null

export async function submitContactForm(
  _prevState: unknown,
  formData: FormData,
): Promise<ContactFormState> {
  // Returned on failure so the form can restore what the user entered.
  const values = getFormValues(formData, CONTACT_FORM_FIELDS)

  try {
    // Block bots before any validation or email send.
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

    // Check if contact form is enabled
    if (!isContactFormEnabled()) {
      return {
        error: 'お問い合わせ機能は現在ご利用いただけません。',
        success: false,
        values,
      }
    }
    // Parse form data
    const rawData = {
      email: formData.get('email') || undefined,
      message: formData.get('message'),
      name: formData.get('name') || undefined,
      type: formData.get('type'),
      wantsReply: formData.get('wantsReply') === 'on',
    }

    // Validate with email requirement if reply is requested
    const validationSchema = rawData.wantsReply
      ? contactFormSchema.refine(
          (data) => data.email && data.email.length > 0,
          {
            message: '返信を希望する場合はメールアドレスが必須です',
            path: ['email'],
          },
        )
      : contactFormSchema

    const result = validationSchema.safeParse(rawData)

    if (!result.success) {
      return { ...toValidationErrorState(result.error), values }
    }

    const { type, name, wantsReply, email, message } = result.data

    // Get type label in Japanese
    const typeLabels = {
      bug: '不具合の報告',
      feature: '機能の要望',
      other: 'その他',
    }

    const emailSubject = `【SHINJU DATE】お問い合わせ: ${typeLabels[type]}`
    const emailText = `■ お問い合わせ内容
${message}

---
このメールはSHINJU DATEのお問い合わせフォームから自動送信されました。`

    // Only send email if admin email is properly configured (not default)
    const adminEmail = serverEnv.ADMIN_EMAIL
    if (!adminEmail || adminEmail === 'admin@example.com') {
      return {
        error: 'メール送信設定が完了していません。',
        success: false,
        values,
      }
    }

    // Set up reply-to with name and email if both available and reply requested
    const replyToValue =
      wantsReply && email && name
        ? `${name} <${email}>`
        : wantsReply && email
          ? email
          : undefined

    if (!resend) {
      return {
        error: 'メール送信設定が完了していません。',
        success: false,
        values,
      }
    }

    // The Resend SDK does not throw on API or network errors; it returns
    // them as `error` instead, so check it explicitly.
    const { error: sendError } = await resend.emails.send({
      from: serverEnv.FROM_EMAIL || 'noreply@shinju.date',
      subject: emailSubject,
      text: emailText,
      to: adminEmail,
      ...(replyToValue && { replyTo: replyToValue }),
    })

    if (sendError) {
      console.error('Failed to send contact form email:', sendError)

      return {
        error:
          '送信中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
        success: false,
        values,
      }
    }

    return {
      message: 'お問い合わせを受け付けました。ありがとうございます。',
      success: true,
    }
  } catch (error) {
    console.error('Contact form submission error:', error)
    return {
      error:
        '送信中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
      success: false,
      values,
    }
  }
}
