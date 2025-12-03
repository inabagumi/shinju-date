import { describe, expect, it } from 'vitest'
import { createTitleFromMessage } from './create-title-from-message'

describe('createTitleFromMessage', () => {
  it('should return the message as-is when it is shorter than 50 characters', () => {
    const message = 'Short message'
    const result = createTitleFromMessage(message)
    expect(result).toBe('Short message')
  })

  it('should normalize newlines to single spaces', () => {
    const message = 'Hello\nworld'
    const result = createTitleFromMessage(message)
    expect(result).toBe('Hello world')
  })

  it('should normalize multiple newlines to single spaces', () => {
    const message = 'Hello\n\n\nworld'
    const result = createTitleFromMessage(message)
    expect(result).toBe('Hello world')
  })

  it('should normalize multiple spaces to single space', () => {
    const message = 'Hello    world'
    const result = createTitleFromMessage(message)
    expect(result).toBe('Hello world')
  })

  it('should normalize tabs to single space', () => {
    const message = 'Hello\t\tworld'
    const result = createTitleFromMessage(message)
    expect(result).toBe('Hello world')
  })

  it('should normalize mixed whitespace (spaces, tabs, newlines) to single space', () => {
    const message = '  Hello  \n\n  world  \t  test  '
    const result = createTitleFromMessage(message)
    expect(result).toBe('Hello world test')
  })

  it('should trim leading and trailing whitespace', () => {
    const message = '  Hello world  '
    const result = createTitleFromMessage(message)
    expect(result).toBe('Hello world')
  })

  it('should truncate message longer than 50 characters and add ellipsis', () => {
    const message =
      'This is a very long message that exceeds the maximum length of 50 characters'
    const result = createTitleFromMessage(message)
    expect(result).toBe('This is a very long message that exceeds the maxim...')
    expect(result.length).toBe(53) // 50 characters + "..."
  })

  it('should handle message exactly 50 characters without truncation', () => {
    const message = '12345678901234567890123456789012345678901234567890' // exactly 50 chars
    const result = createTitleFromMessage(message)
    expect(result).toBe(message)
    expect(result.length).toBe(50)
  })

  it('should handle message with 51 characters with truncation', () => {
    const message = '123456789012345678901234567890123456789012345678901' // 51 chars
    const result = createTitleFromMessage(message)
    expect(result).toBe('12345678901234567890123456789012345678901234567890...')
    expect(result.length).toBe(53)
  })

  it('should handle empty string', () => {
    const message = ''
    const result = createTitleFromMessage(message)
    expect(result).toBe('')
  })

  it('should handle string with only whitespace', () => {
    const message = '   \n\n\t  '
    const result = createTitleFromMessage(message)
    expect(result).toBe('')
  })

  it('should handle markdown-style message with newlines', () => {
    const message = `Feature request:

Please add dark mode support

It would be great to have a dark theme option for the admin panel.`
    const result = createTitleFromMessage(message)
    expect(result).toBe('Feature request: Please add dark mode support It w...')
  })

  it('should handle message with multiple consecutive spaces and newlines', () => {
    const message = 'Line1   \n\n   Line2     Line3'
    const result = createTitleFromMessage(message)
    expect(result).toBe('Line1 Line2 Line3')
  })
})
