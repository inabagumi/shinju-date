import type { User } from '@supabase/supabase-js'

/**
 * 管理画面を利用できるユーザーの `app_metadata.role` の値。
 *
 * データベース側では `public.is_admin()` が同じ値を確認し、RLS で管理者以外の
 * 読み書きを拒否する。`app_metadata` はユーザー自身では変更できず、サービスロール
 * （`supabase.auth.admin.updateUserById`）か SQL でのみ設定できる。
 */
export const ADMIN_ROLE = 'admin'

/**
 * ユーザーが管理者ロールを持つかどうかを返す。
 *
 * Supabase Auth にログインできること自体は管理者であることを意味しないため、
 * 管理画面へのアクセスを許可する前に必ずこの関数で確認する。
 */
export function isAdminUser(user: Pick<User, 'app_metadata'>): boolean {
  return user.app_metadata?.['role'] === ADMIN_ROLE
}
