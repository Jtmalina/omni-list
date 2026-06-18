import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '@/test/prisma-mock'
import { auth } from '@/lib/auth'
import { toggleFollowAction, getFollowsAction } from './follow'
import { FollowType, MediaType } from '@prisma/client'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

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
