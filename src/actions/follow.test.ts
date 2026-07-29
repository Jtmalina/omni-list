import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '@/test/prisma-mock'
import { auth } from '@/lib/auth'
import { toggleFollowAction, getFollowsAction, syncUpcomingReleasesAction } from './follow'
import { FollowType, MediaType } from '@prisma/client'
import { discoverNewMedia } from '@/lib/media-api'
import { logActivity } from '@/lib/activity'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/activity', () => ({ logActivity: vi.fn() }))
vi.mock('@/lib/media-api', () => ({
  discoverNewMedia: vi.fn(),
  discoverNewGames: vi.fn(),
  searchPersons: vi.fn(() => Promise.resolve([])),
  searchStudios: vi.fn(() => Promise.resolve([])),
}))

const USER = 'user-1'
const payload = {
  externalId: '525',
  type: FollowType.PERSON,
  mediaType: MediaType.MOVIE,
  name: 'Christopher Nolan',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ user: { id: USER } } as any)
})

describe('toggleFollowAction', () => {
  it('rejects an unauthenticated caller', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    await expect(toggleFollowAction(payload)).rejects.toThrow('Unauthorized')
  })

  it('creates a follow when none exists', async () => {
    prismaMock.follow.findUnique.mockResolvedValue(null)
    prismaMock.follow.create.mockResolvedValue({ id: 'f-1' } as any)

    const res = await toggleFollowAction(payload)
    expect(res).toEqual({ success: true, isFollowing: true })
    expect(prismaMock.follow.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ externalId: '525', userId: USER }) }),
    )
  })

  it('removes an existing follow', async () => {
    prismaMock.follow.findUnique.mockResolvedValue({ id: 'f-1' } as any)
    prismaMock.follow.delete.mockResolvedValue({ id: 'f-1' } as any)

    const res = await toggleFollowAction(payload)
    expect(res).toEqual({ success: true, isFollowing: false })
    expect(prismaMock.follow.delete).toHaveBeenCalledWith({ where: { id: 'f-1' } })
    expect(prismaMock.follow.create).not.toHaveBeenCalled()
  })
})

describe('getFollowsAction', () => {
  it('returns an empty list for an unauthenticated caller', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    await expect(getFollowsAction()).resolves.toEqual([])
    expect(prismaMock.follow.findMany).not.toHaveBeenCalled()
  })

  it('queries only the current user\'s follows', async () => {
    prismaMock.follow.findMany.mockResolvedValue([] as any)
    await getFollowsAction()
    expect(prismaMock.follow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER } }),
    )
  })
})

describe('syncUpcomingReleasesAction', () => {
  const personFollow = (over: Partial<any> = {}) => ({
    id: 'f1', type: 'PERSON', externalId: '525', name: 'Nolan',
    mediaType: 'MOVIE', lastCheckedAt: null, ...over,
  })
  const userWithFollows = (follows: any[]) => ({ id: 'u1', autoAddListId: 'list-1', follows })

  beforeEach(() => {
    prismaMock.item.create.mockResolvedValue({ id: 'new-1', title: 'New Movie' } as any)
    prismaMock.follow.updateMany.mockResolvedValue({ count: 1 } as any)
  })

  it('creates only new releases, deduping against existing items in one query', async () => {
    prismaMock.user.findMany.mockResolvedValue([userWithFollows([personFollow()])] as any)
    prismaMock.item.findMany.mockResolvedValue([
      { title: 'Existing Movie', media: { externalId: '200' } },
    ] as any)
    vi.mocked(discoverNewMedia).mockResolvedValue([
      { id: '100', title: 'New Movie', overview: 'x', releaseDate: '2026-08-01', posterPath: null, voteAverage: 7 },
      // dupe by externalId, and a different title — must still be skipped
      { id: '200', title: 'Renamed Movie', overview: '', releaseDate: '2026-01-01', posterPath: null, voteAverage: 6 },
    ] as any)

    const res = await syncUpcomingReleasesAction()

    expect(res).toEqual({ success: true, addedCount: 1 })
    expect(prismaMock.item.create).toHaveBeenCalledTimes(1)
    expect(prismaMock.item.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'New Movie',
          listId: 'list-1',
          media: { create: expect.objectContaining({ externalId: '100' }) },
        }),
      }),
    )
    // No per-item dedupe lookup anymore
    expect(prismaMock.item.findFirst).not.toHaveBeenCalled()
  })

  it('runs without a session (the cron path) instead of throwing Unauthorized', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    prismaMock.user.findMany.mockResolvedValue([userWithFollows([personFollow()])] as any)
    prismaMock.item.findMany.mockResolvedValue([] as any)
    vi.mocked(discoverNewMedia).mockResolvedValue([
      { id: '100', title: 'New Movie', overview: 'x', releaseDate: '2026-08-01', posterPath: null, voteAverage: 7 },
    ] as any)

    const res = await syncUpcomingReleasesAction()

    expect(res.addedCount).toBe(1)
    expect(prismaMock.item.create).toHaveBeenCalledTimes(1)
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', listId: 'list-1', itemTitle: 'New Movie' }),
    )
  })

  it('bumps lastCheckedAt for all of a user\'s follows in a single updateMany', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      userWithFollows([personFollow(), personFollow({ id: 'f2', externalId: '526' })]),
    ] as any)
    prismaMock.item.findMany.mockResolvedValue([] as any)
    vi.mocked(discoverNewMedia).mockResolvedValue([] as any)

    await syncUpcomingReleasesAction()

    expect(prismaMock.follow.updateMany).toHaveBeenCalledTimes(1)
    expect(prismaMock.follow.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['f1', 'f2'] } } }),
    )
    expect(prismaMock.follow.update).not.toHaveBeenCalled()
  })
})
