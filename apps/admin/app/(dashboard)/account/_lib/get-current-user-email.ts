import { cacheLife } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase'

/**
 * ログインしているユーザーのメールアドレスを返す。ログインしていなければ
 * `null` を返す。
 *
 * メールアドレスを変えたあとの表示が古いまま残らないよう、ほかの取得関数より
 * 短い `seconds` にする
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  'use cache: private'

  cacheLife('seconds')

  const supabaseClient = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser()

  if (error || !user) {
    return null
  }

  return user.email ?? ''
}
