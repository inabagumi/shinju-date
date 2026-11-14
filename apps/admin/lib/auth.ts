import type { User } from '@supabase/supabase-js'
import type { FormState } from '@/components/form'
import {
  createSupabaseServerClient,
  type TypedSupabaseClient,
} from '@/lib/supabase'

/**
 * 未認証のリクエストに対して Server Action が返すエラーメッセージ。
 */
export const UNAUTHENTICATED_ERROR_MESSAGE =
  'ログインセッションが無効です。再度ログインしてからお試しください。'

export interface AuthenticatedContext {
  supabaseClient: TypedSupabaseClient
  user: User
}

/**
 * Server Action の先頭で呼び出し、リクエストが認証済みユーザーによるものかを検証する。
 *
 * `proxy.ts` によるセッション保護とは別に、`matcher` の設定などに左右されないよう
 * Action 単位でも認証を確認する（多層防御）。未認証の場合は `null` を返すので、
 * 呼び出し側は更新処理を行わずに `unauthenticatedResult()` または
 * `unauthenticatedFormState()` を返すこと。
 *
 * 認証済みの場合は、検証に使用した Supabase クライアントをそのまま返すため、
 * 呼び出し側で改めて `createSupabaseServerClient()` を呼ぶ必要はない。
 *
 * @example
 * ```ts
 * export async function deleteSomethingAction(id: string) {
 *   const auth = await requireAuthenticatedUser()
 *
 *   if (!auth) {
 *     return unauthenticatedResult()
 *   }
 *
 *   const { supabaseClient } = auth
 *   // ...
 * }
 * ```
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedContext | null> {
  try {
    const supabaseClient = await createSupabaseServerClient()
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser()

    if (error || !user) {
      return null
    }

    return { supabaseClient, user }
  } catch {
    return null
  }
}

/**
 * `{ success, error }` 形式を返す Server Action 用の未認証レスポンス。
 */
export function unauthenticatedResult(): { success: false; error: string } {
  return {
    error: UNAUTHENTICATED_ERROR_MESSAGE,
    success: false,
  }
}

/**
 * `FormState` を返す Server Action（`useActionState` 用）の未認証レスポンス。
 */
export function unauthenticatedFormState(): FormState {
  return {
    errors: {
      generic: [UNAUTHENTICATED_ERROR_MESSAGE],
    },
  }
}
