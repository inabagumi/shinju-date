import { describe, expect, it } from 'vitest'
import { Card, CardContent, CardFooter, CardHeader } from '../src/card'

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

  it('should export CardFooter component', () => {
    expect(CardFooter).toBeDefined()
  })
})
