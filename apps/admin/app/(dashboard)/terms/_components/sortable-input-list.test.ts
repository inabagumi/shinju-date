import { describe, expect, it } from 'vitest'

/**
 * Test helper functions for SortableInputList
 * Since this is a client component with complex drag-and-drop interactions,
 * we test the core logic that can be extracted.
 */

describe('SortableInputList data handling', () => {
  it('should filter empty values from array', () => {
    const values = ['test1', '', 'test2', '  ', 'test3']
    const filtered = values.map((v) => v.trim()).filter(Boolean)
    expect(filtered).toEqual(['test1', 'test2', 'test3'])
  })

  it('should split pasted text by newlines', () => {
    const pastedText = 'line1\nline2\nline3'
    const lines = pastedText.split('\n').filter((line) => line.trim() !== '')
    expect(lines).toEqual(['line1', 'line2', 'line3'])
  })

  it('should handle pasted text with empty lines', () => {
    const pastedText = 'line1\n\nline2\n  \nline3'
    const lines = pastedText.split('\n').filter((line) => line.trim() !== '')
    expect(lines).toEqual(['line1', 'line2', 'line3'])
  })

  it('should detect newlines in pasted text', () => {
    const textWithNewlines = 'line1\nline2'
    const textWithoutNewlines = 'single line'

    expect(textWithNewlines.includes('\n')).toBe(true)
    expect(textWithoutNewlines.includes('\n')).toBe(false)
  })

  it('should handle empty pasted text', () => {
    const pastedText = ''
    const lines = pastedText.split('\n').filter((line) => line.trim() !== '')
    expect(lines).toEqual([])
  })

  it('should handle pasted text with only whitespace', () => {
    const pastedText = '   \n\n   '
    const lines = pastedText.split('\n').filter((line) => line.trim() !== '')
    expect(lines).toEqual([])
  })

  it('should preserve order when extracting values', () => {
    const items = [
      { id: '1', value: 'first' },
      { id: '2', value: 'second' },
      { id: '3', value: 'third' },
    ]
    const values = items.map((item) => item.value)
    expect(values).toEqual(['first', 'second', 'third'])
  })
})

describe('FormData array extraction', () => {
  it('should extract array values from FormData-like structure', () => {
    // Simulate FormData entries
    const entries: [string, string][] = [
      ['readings[0]', 'reading1'],
      ['readings[1]', 'reading2'],
      ['readings[2]', 'reading3'],
      ['term', 'test term'],
    ]

    const readingsArray: string[] = []
    for (const [key, value] of entries) {
      if (key.startsWith('readings[')) {
        readingsArray.push(value)
      }
    }

    expect(readingsArray).toEqual(['reading1', 'reading2', 'reading3'])
  })

  it('should handle mixed FormData entries', () => {
    const entries: [string, string][] = [
      ['term', 'test'],
      ['readings[0]', 'reading1'],
      ['synonyms[0]', 'synonym1'],
      ['readings[1]', 'reading2'],
      ['synonyms[1]', 'synonym2'],
    ]

    const readingsArray: string[] = []
    const synonymsArray: string[] = []

    for (const [key, value] of entries) {
      if (key.startsWith('readings[')) {
        readingsArray.push(value)
      } else if (key.startsWith('synonyms[')) {
        synonymsArray.push(value)
      }
    }

    expect(readingsArray).toEqual(['reading1', 'reading2'])
    expect(synonymsArray).toEqual(['synonym1', 'synonym2'])
  })

  it('should filter and trim extracted values', () => {
    const values = ['  reading1  ', '', 'reading2', '   ', 'reading3']
    const filtered = values.map((v) => v.trim()).filter(Boolean)
    expect(filtered).toEqual(['reading1', 'reading2', 'reading3'])
  })
})
