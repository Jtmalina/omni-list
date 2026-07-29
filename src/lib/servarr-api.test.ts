import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getTvdbIdFromTmdb } from './servarr-api'

describe('getTvdbIdFromTmdb', () => {
  beforeEach(() => {
    vi.stubEnv('TMDB_API_KEY', 'test-token')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('caches the immutable TMDB->TVDB mapping and hits the API only once', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ tvdb_id: 12345 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    // A unique id keeps this independent of the module-level cache's other entries.
    const first = await getTvdbIdFromTmdb('900001')
    const second = await getTvdbIdFromTmdb('900001')

    expect(first).toBe(12345)
    expect(second).toBe(12345)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not cache a failed lookup, so it can recover on a later call', async () => {
    const fetchMock = vi.fn(async () => new Response('not found', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const a = await getTvdbIdFromTmdb('900002')
    const b = await getTvdbIdFromTmdb('900002')

    expect(a).toBeNull()
    expect(b).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
