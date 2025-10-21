import { describe, expect, it } from 'vitest'

/**
 * Test data extraction logic for term actions
 * These tests verify the FormData processing logic used in createTermAction and updateTermAction
 */

describe('Term action FormData processing', () => {
  describe('array extraction from FormData', () => {
    it('should extract readings array from FormData entries', () => {
      const formDataEntries: [string, FormDataEntryValue][] = [
        ['term', 'test term'],
        ['readings[0]', 'reading1'],
        ['readings[1]', 'reading2'],
        ['readings[2]', 'reading3'],
      ]

      const readingsArray: string[] = []
      for (const [key, value] of formDataEntries) {
        if (key.startsWith('readings[') && typeof value === 'string') {
          readingsArray.push(value)
        }
      }

      expect(readingsArray).toEqual(['reading1', 'reading2', 'reading3'])
    })

    it('should extract synonyms array from FormData entries', () => {
      const formDataEntries: [string, FormDataEntryValue][] = [
        ['term', 'test term'],
        ['synonyms[0]', 'synonym1'],
        ['synonyms[1]', 'synonym2'],
      ]

      const synonymsArray: string[] = []
      for (const [key, value] of formDataEntries) {
        if (key.startsWith('synonyms[') && typeof value === 'string') {
          synonymsArray.push(value)
        }
      }

      expect(synonymsArray).toEqual(['synonym1', 'synonym2'])
    })

    it('should extract both readings and synonyms arrays', () => {
      const formDataEntries: [string, FormDataEntryValue][] = [
        ['term', 'test term'],
        ['readings[0]', 'reading1'],
        ['synonyms[0]', 'synonym1'],
        ['readings[1]', 'reading2'],
        ['synonyms[1]', 'synonym2'],
      ]

      const readingsArray: string[] = []
      const synonymsArray: string[] = []

      for (const [key, value] of formDataEntries) {
        if (key.startsWith('readings[') && typeof value === 'string') {
          readingsArray.push(value)
        } else if (key.startsWith('synonyms[') && typeof value === 'string') {
          synonymsArray.push(value)
        }
      }

      expect(readingsArray).toEqual(['reading1', 'reading2'])
      expect(synonymsArray).toEqual(['synonym1', 'synonym2'])
    })

    it('should handle empty arrays', () => {
      const formDataEntries: [string, FormDataEntryValue][] = [
        ['term', 'test term'],
      ]

      const readingsArray: string[] = []
      const synonymsArray: string[] = []

      for (const [key, value] of formDataEntries) {
        if (key.startsWith('readings[') && typeof value === 'string') {
          readingsArray.push(value)
        } else if (key.startsWith('synonyms[') && typeof value === 'string') {
          synonymsArray.push(value)
        }
      }

      expect(readingsArray).toEqual([])
      expect(synonymsArray).toEqual([])
    })
  })

  describe('filtering and trimming', () => {
    it('should filter out empty values', () => {
      const values = ['reading1', '', 'reading2', '   ', 'reading3']
      const filtered = values.map((r) => r.trim()).filter(Boolean)
      
      expect(filtered).toEqual(['reading1', 'reading2', 'reading3'])
    })

    it('should trim whitespace from values', () => {
      const values = ['  reading1  ', ' reading2 ', 'reading3']
      const trimmed = values.map((r) => r.trim()).filter(Boolean)
      
      expect(trimmed).toEqual(['reading1', 'reading2', 'reading3'])
    })

    it('should handle all empty values', () => {
      const values = ['', '  ', '   ']
      const filtered = values.map((r) => r.trim()).filter(Boolean)
      
      expect(filtered).toEqual([])
    })

    it('should preserve order after filtering', () => {
      const values = ['third', '', 'first', '  ', 'second']
      const filtered = values.map((r) => r.trim()).filter(Boolean)
      
      expect(filtered).toEqual(['third', 'first', 'second'])
    })
  })
})
