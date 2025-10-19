import { describe, expect, it } from 'vitest'
import { escapeSearchString } from './escape-search'

describe('escapeSearchString', () => {
  it('escapes % character', () => {
    expect(escapeSearchString('test%')).toBe('test\\%')
  })

  it('escapes _ character', () => {
    expect(escapeSearchString('test_')).toBe('test\\_')
  })

  it('escapes multiple % characters', () => {
    expect(escapeSearchString('test%value%')).toBe('test\\%value\\%')
  })

  it('escapes multiple _ characters', () => {
    expect(escapeSearchString('test_value_')).toBe('test\\_value\\_')
  })

  it('escapes both % and _ characters', () => {
    expect(escapeSearchString('test%value_name')).toBe('test\\%value\\_name')
  })

  it('returns unchanged string when no special characters present', () => {
    expect(escapeSearchString('test')).toBe('test')
  })

  it('handles empty string', () => {
    expect(escapeSearchString('')).toBe('')
  })

  it('handles string with only special characters', () => {
    expect(escapeSearchString('%_%')).toBe('\\%\\_\\%')
  })

  it('handles SQL injection attempts', () => {
    const malicious = 'xxx%other_column.ilike.%malicious_phrase'
    const escaped = escapeSearchString(malicious)
    expect(escaped).toBe('xxx\\%other\\_column.ilike.\\%malicious\\_phrase')
  })
})
