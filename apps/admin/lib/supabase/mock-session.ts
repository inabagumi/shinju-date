interface Cookie {
  name: string
  value: string
}

/**
 * MSW を有効にした環境（`ENABLE_MSW=true`）で `MSW_SUPABASE_AUTHENTICATED=true` の
 * とき、Supabase Auth のセッションの Cookie がなければ、MSW のモックのセッションの
 * Cookie を加える。それ以外の場合は `cookies` をそのまま返す。
 *
 * supabase-js はセッションがないと `/auth/v1/user` へリクエストを送らずに
 * `AuthSessionMissingError` を返すため、MSW のハンドラーだけではログインせずに
 * 認証済みとして扱えない。モックのアクセストークンは MSW のハンドラーしか
 * 受け付けないため、本番環境の認証には影響しない。
 *
 * @param supabaseURL - Supabase の URL（Cookie の名前を決めるのに使う）
 * @param cookies - リクエストの Cookie
 * @returns Supabase クライアントに渡す Cookie
 */
export async function withMockSessionCookie(
  supabaseURL: string,
  cookies: Cookie[],
): Promise<Cookie[]> {
  if (
    process.env['ENABLE_MSW'] !== 'true' ||
    process.env['MSW_SUPABASE_AUTHENTICATED'] !== 'true'
  ) {
    return cookies
  }

  // supabase-js の既定のストレージキーと同じ名前
  const storageKey = `sb-${new URL(supabaseURL).hostname.split('.')[0]}-auth-token`

  // セッションの Cookie は `.0`、`.1` のように分割されることがある
  if (
    cookies.some(
      ({ name }) => name === storageKey || name.startsWith(`${storageKey}.`),
    )
  ) {
    return cookies
  }

  const { MOCK_SUPABASE_SESSION } = await import(
    '@shinju-date/msw-handlers/session'
  )

  return [
    ...cookies,
    { name: storageKey, value: JSON.stringify(MOCK_SUPABASE_SESSION) },
  ]
}
