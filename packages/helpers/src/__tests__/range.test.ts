import { describe, expect, it } from 'vitest'
import { range } from '../range.js'

describe('range', () => {
  describe('single argument (stop)', () => {
    it('should generate array from 0 to stop-1', () => {
      expect(range(5)).toEqual([0, 1, 2, 3, 4])
    })

    it('should return empty array for 0', () => {
      expect(range(0)).toEqual([])
    })

    it('should return empty array for negative numbers', () => {
      expect(range(-5)).toEqual([])
    })
  })

  describe('two arguments (start, stop)', () => {
    it('should generate array from start to stop-1', () => {
      expect(range(2, 5)).toEqual([2, 3, 4])
    })

    it('should return empty array when start >= stop', () => {
      expect(range(5, 2)).toEqual([])
      expect(range(5, 5)).toEqual([])
    })

    it('should work with negative numbers', () => {
      expect(range(-3, 2)).toEqual([-3, -2, -1, 0, 1])
    })
  })

  describe('three arguments (start, stop, step)', () => {
    it('should generate array with positive step', () => {
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8])
    })

    it('should generate array with negative step', () => {
      expect(range(5, 0, -1)).toEqual([5, 4, 3, 2, 1])
      expect(range(10, 0, -2)).toEqual([10, 8, 6, 4, 2])
    })

    it('should return empty array when step direction is wrong', () => {
      expect(range(0, 10, -1)).toEqual([])
      expect(range(10, 0, 1)).toEqual([])
    })

    it('should throw error for step of 0', () => {
      expect(() => range(0, 10, 0)).toThrow('Range step cannot be zero')
    })

    it('should work with fractional steps', () => {
      expect(range(0, 1, 0.2)).toEqual([0, 0.2, 0.4, 0.6000000000000001, 0.8])
    })
  })

  describe('edge cases', () => {
    it('should handle large ranges', () => {
      const result = range(1000)
      expect(result.length).toBe(1000)
      expect(result[0]).toBe(0)
      expect(result[999]).toBe(999)
    })

    it('should handle single element range', () => {
      expect(range(1)).toEqual([0])
      expect(range(5, 6)).toEqual([5])
    })
  })
})
