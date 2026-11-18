/**
 * The user that the mock Supabase Auth API signs in. The admin app is only
 * for users with the admin role, so the user has it.
 */
export const MOCK_SUPABASE_USER = {
  app_metadata: {
    provider: "email",
    providers: ["email"],
    // 管理画面は管理者ロールを持つユーザーのみ利用できる
    role: "admin",
  },
  aud: "authenticated",
  confirmed_at: "2023-01-01T00:00:00.000Z",
  created_at: "2023-01-01T00:00:00.000Z",
  email: "admin@example.com",
  email_confirmed_at: "2023-01-01T00:00:00.000Z",
  id: "mock-user-id",
  identities: [
    {
      created_at: "2023-01-01T00:00:00.000Z",
      id: "mock-user-id",
      identity_data: {
        email: "admin@example.com",
        sub: "mock-user-id",
      },
      last_sign_in_at: "2023-01-01T00:00:00.000Z",
      provider: "email",
      updated_at: "2023-01-01T00:00:00.000Z",
      user_id: "mock-user-id",
    },
  ],
  last_sign_in_at: "2023-01-01T00:00:00.000Z",
  phone: "",
  role: "authenticated",
  updated_at: "2023-01-01T00:00:00.000Z",
  user_metadata: {},
};

/**
 * The session that the mock Supabase Auth API returns when signing in. The
 * access token is only accepted by the mock handlers, and the session does
 * not expire.
 */
export const MOCK_SUPABASE_SESSION = {
  access_token: "mock_access_token",
  expires_at: 9999999999,
  expires_in: 3600,
  refresh_token: "mock_refresh_token",
  token_type: "bearer",
  user: MOCK_SUPABASE_USER,
};
