import { describe, it, expect } from 'vitest'
import { fresh, stable, discoverOpts } from './swrOptions'

describe('swr presets', () => {
  it('disable focus revalidation to avoid background refetch storms', () => {
    expect(fresh.revalidateOnFocus).toBe(false)
    expect(stable.revalidateOnFocus).toBe(false)
    expect(discoverOpts.revalidateOnFocus).toBe(false)
  })

  it('keep sensible dedupe windows', () => {
    expect(fresh.dedupingInterval).toBeGreaterThanOrEqual(30_000)
    expect(discoverOpts.dedupingInterval).toBeGreaterThan(stable.dedupingInterval)
  })
})
