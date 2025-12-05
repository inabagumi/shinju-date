import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('should export Input component', () => {
    expect(Input).toBeDefined()
  })

  it('should have correct display name', () => {
    expect(Input.name).toBe('Input')
  })
})
