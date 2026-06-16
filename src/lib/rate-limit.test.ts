import { describe, it, expect, vi, afterEach } from 'vitest'
import { rateLimit, enforceRateLimit } from './rate-limit'

describe('rateLimit', () => {
  afterEach(() => vi.useRealTimers())

  it('allows hits up to the limit, then blocks', () => {
    const key = `test-${Math.random()}`
    expect(rateLimit(key, 3, 1000).ok).toBe(true)
    expect(rateLimit(key, 3, 1000).ok).toBe(true)
    expect(rateLimit(key, 3, 1000).ok).toBe(true)
    const blocked = rateLimit(key, 3, 1000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('resets after the window elapses', () => {
    vi.useFakeTimers()
    const key = `test-${Math.random()}`
    expect(rateLimit(key, 1, 1000).ok).toBe(true)
    expect(rateLimit(key, 1, 1000).ok).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(rateLimit(key, 1, 1000).ok).toBe(true)
  })

  it('tracks separate keys independently', () => {
    const a = `a-${Math.random()}`
    const b = `b-${Math.random()}`
    expect(rateLimit(a, 1, 1000).ok).toBe(true)
    expect(rateLimit(a, 1, 1000).ok).toBe(false)
    // different key still has its full budget
    expect(rateLimit(b, 1, 1000).ok).toBe(true)
  })

  it('enforceRateLimit throws when exceeded', () => {
    const key = `throw-${Math.random()}`
    enforceRateLimit(key, 1, 1000)
    expect(() => enforceRateLimit(key, 1, 1000)).toThrow(/Too many requests/)
  })
})
