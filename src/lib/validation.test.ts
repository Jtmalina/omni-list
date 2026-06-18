import { describe, it, expect } from 'vitest'
import { idSchema, seasonsSchema, serverIdSchema, parseOrThrow } from './validation'

describe('validation schemas', () => {
  describe('idSchema', () => {
    it('accepts cuid-style ids', () => {
      expect(idSchema.safeParse('clh3k2j1x0000abcd1234efgh').success).toBe(true)
      expect(idSchema.safeParse('user-1_x').success).toBe(true)
    })
    it('rejects empty, overlong, or unsafe ids', () => {
      expect(idSchema.safeParse('').success).toBe(false)
      expect(idSchema.safeParse('a'.repeat(65)).success).toBe(false)
      expect(idSchema.safeParse('id with spaces').success).toBe(false)
      expect(idSchema.safeParse("'; DROP TABLE--").success).toBe(false)
    })
  })

  describe('seasonsSchema', () => {
    it('accepts bounded integer arrays', () => {
      expect(seasonsSchema.safeParse([0, 1, 2, 3]).success).toBe(true)
      expect(seasonsSchema.safeParse([]).success).toBe(true)
    })
    it('rejects non-integers, negatives, and oversized arrays', () => {
      expect(seasonsSchema.safeParse([1.5]).success).toBe(false)
      expect(seasonsSchema.safeParse([-1]).success).toBe(false)
      expect(seasonsSchema.safeParse(['1']).success).toBe(false)
      expect(seasonsSchema.safeParse(Array.from({ length: 101 }, (_, i) => i)).success).toBe(false)
    })
  })

  describe('serverIdSchema', () => {
    it('accepts positive integers only', () => {
      expect(serverIdSchema.safeParse(5).success).toBe(true)
      expect(serverIdSchema.safeParse(0).success).toBe(false)
      expect(serverIdSchema.safeParse(-3).success).toBe(false)
      expect(serverIdSchema.safeParse(2.5).success).toBe(false)
    })
  })

  describe('parseOrThrow', () => {
    it('returns the parsed value on success', () => {
      expect(parseOrThrow(serverIdSchema, 7, 'server id')).toBe(7)
    })
    it('throws a clean labelled error on failure', () => {
      expect(() => parseOrThrow(idSchema, 'bad id', 'item id')).toThrow('Invalid item id.')
    })
  })
})
