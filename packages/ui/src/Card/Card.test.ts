import { describe, expect, it } from 'vitest'
import { Card, CardContent, CardHeader } from './Card'

describe('Card components', () => {
  it('should export Card component', () => {
    expect(Card).toBeDefined()
  })

  it('should export CardHeader component', () => {
    expect(CardHeader).toBeDefined()
  })

  it('should export CardContent component', () => {
    expect(CardContent).toBeDefined()
  })
})
