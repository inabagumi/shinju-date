'use server'

import { Resend } from 'resend'
import { z } from 'zod'
import { isContactFormEnabled } from './utils'

const contactFormSchema = z.object({
  email: z.string().email().optional(),
  message: z.string().min(1, 'メッセージは必須です'),
  name: z.string().optional(),
  type: z.enum(['bug', 'feature', 'other']),
  wantsReply: z.boolean().default(false),
})

// Only initialize Resend if API key is available
const resend = process.env['RESEND_API_KEY']
  ? new Resend(process.env['RESEND_API_KEY'])
  : null

export async function submitContactForm(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Check if contact form is enabled
    if (!isContactFormEnabled()) {
      return {
        error: 'お問い合わせ機能は現在ご利用いただけません。',
        success: false,
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
      return {
        error: result.error.issues.map((e) => e.message).join(', '),
        success: false,
      }
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
    const adminEmail = process.env['ADMIN_EMAIL']
    if (!adminEmail || adminEmail === 'admin@example.com') {
      return {
        error: 'メール送信設定が完了していません。',
        success: false,
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
      }
    }

    await resend.emails.send({
      from: process.env['FROM_EMAIL'] || 'noreply@shinju.date',
      subject: emailSubject,
      text: emailText,
      to: adminEmail,
      ...(replyToValue && { replyTo: replyToValue }),
    })

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
    }
  }
}
