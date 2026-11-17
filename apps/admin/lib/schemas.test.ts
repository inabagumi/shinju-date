import { describe, expect, it } from 'vitest'
import { uuidSchema } from './schemas'

describe('uuidSchema', () => {
  it.each([
    // supabase/seed.sql のタレントの ID（バージョンとバリアントの桁が 0）
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '123e4567-e89b-12d3-a456-426614174000',
    'A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11',
  ])('accepts %s', (value) => {
    expect(uuidSchema.safeParse(value).success).toBe(true)
  })

  it.each([
    '',
    'invalid-uuid',
    '00000000-0000-0000-0000-00000000000',
    '00000000000000000000000000000001',
    'g0000000-0000-0000-0000-000000000001',
  ])('rejects %j', (value) => {
    expect(uuidSchema.safeParse(value).success).toBe(false)
  })
})
