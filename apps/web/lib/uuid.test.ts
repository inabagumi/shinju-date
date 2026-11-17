import { describe, expect, test } from 'vitest'
import { isUUID } from './uuid'

describe('isUUID', () => {
  test('should accept UUIDs', () => {
    expect(isUUID('7c3f1b2a-4d5e-4f60-8a1b-2c3d4e5f6a7b')).toBe(true)
    expect(isUUID('7C3F1B2A-4D5E-4F60-8A1B-2C3D4E5F6A7B')).toBe(true)
    expect(isUUID('00000000-0000-0000-0000-000000000000')).toBe(true)
  })

  test('should reject other values', () => {
    expect(isUUID('')).toBe(false)
    expect(isUUID('not-a-uuid')).toBe(false)
    expect(isUUID('7c3f1b2a4d5e4f608a1b2c3d4e5f6a7b')).toBe(false)
    expect(isUUID('7c3f1b2a-4d5e-4f60-8a1b-2c3d4e5f6a7b.ics')).toBe(false)
    expect(isUUID('7c3f1b2a-4d5e-4f60-8a1b-2c3d4e5f6a7g')).toBe(false)
  })
})
