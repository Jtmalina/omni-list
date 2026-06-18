import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '@/test/prisma-mock'
import { auth } from '@/lib/auth'
import * as mediaApi from '@/lib/media-api'
import { getRecommendationsAction, getTrendingAction } from './media'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  enforceRateLimit: vi.fn(),
}))
vi.mock('@/lib/media-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/media-api')>()
  return {
    ...actual,
    getMediaRecommendations: vi.fn(),
    getGameGenres: vi.fn(() => Promise.resolve([])),
    getGamesByGenres: vi.fn(() => Promise.resolve([])),
    getTrendingMedia: vi.fn(),
    getTrendingGames: vi.fn(),
    getUpcomingMedia: vi.fn(() => Promise.resolve([])),
    getUpcomingGames: vi.fn(() => Promise.resolve([])),
  }
})

const USER = 'user-1'
const movie = (id: string, vote = 7) => ({
  id, title: `Movie ${id}`, overview: '', posterPath: null,
  releaseDate: '', mediaType: 'movie' as const, voteAverage: vote,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ user: { id: USER } } as any)
})

describe('getRecommendationsAction', () => {
  it('returns nothing for an unauthenticated caller', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    await expect(getRecommendationsAction()).resolves.toEqual([])
    expect(prismaMock.item.findMany).not.toHaveBeenCalled()
  })

  it('recommends titles not already in the library and excludes ones that are', async () => {
    // Library: one movie (tmdb 100) the user already tracks
    prismaMock.item.findMany.mockResolvedValue([
      { id: 'i1', mediaType: 'MOVIE', status: 'TODO', createdAt: new Date(), media: { externalId: '100' } },
    ] as any)
    // TMDB suggests the one they have (100) plus a new one (200)
    vi.mocked(mediaApi.getMediaRecommendations).mockResolvedValue([movie('100'), movie('200')])

    const result = await getRecommendationsAction()
    const ids = result.map((r) => r.id)
    expect(ids).toContain('200')
    expect(ids).not.toContain('100') // already in the library
  })
})

describe('getTrendingAction', () => {
  it('merges trending media and games into one feed', async () => {
    vi.mocked(mediaApi.getTrendingMedia).mockResolvedValue([movie('300')])
    vi.mocked(mediaApi.getTrendingGames).mockResolvedValue([
      { id: 'g1', title: 'Game', overview: '', posterPath: null, releaseDate: '', mediaType: 'game', rating: 4.5, metacritic: 90, esrb: null, platforms: [], stores: [] },
    ] as any)

    const result = await getTrendingAction()
    expect(result.map((r) => r.id)).toEqual(expect.arrayContaining(['300', 'g1']))
  })
})
