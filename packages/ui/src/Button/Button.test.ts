import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('should export Button component', () => {
    expect(Button).toBeDefined()
  })

  it('should have correct display name', () => {
    expect(Button.name).toBe('Button')
  })
})
