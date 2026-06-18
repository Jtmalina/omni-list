import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '@/test/prisma-mock'
import { auth } from '@/lib/auth'
import { verifyListAccess } from '@/lib/permissions'
import { shareListAction, revokeAccessAction } from './share'
import { AccessLevel } from '@prisma/client'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/permissions', () => ({ verifyListAccess: vi.fn() }))
vi.mock('@/lib/activity', () => ({ logActivity: vi.fn() }))

const OWNER = 'owner-1'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ user: { id: OWNER } } as any)
  vi.mocked(verifyListAccess).mockResolvedValue(OWNER)
})

describe('shareListAction', () => {
  it('requires OWNER access to share', async () => {
    prismaMock.listAccess.upsert.mockResolvedValue({} as any)
    prismaMock.list.findUnique.mockResolvedValue({ id: 'list-1', title: 'Movies' } as any)
    prismaMock.user.findUnique.mockResolvedValue({ id: 'friend-1', name: 'Pat', email: 'p@x.com' } as any)

    await shareListAction('list-1', 'friend-1', AccessLevel.VIEW)
    expect(verifyListAccess).toHaveBeenCalledWith('list-1', 'OWNER')
  })

  it('rejects an invalid access level before touching the DB', async () => {
    await expect(shareListAction('list-1', 'friend-1', 'ADMIN' as any)).rejects.toThrow('Invalid access level.')
    expect(verifyListAccess).not.toHaveBeenCalled()
    expect(prismaMock.listAccess.upsert).not.toHaveBeenCalled()
  })

  it('rejects a malformed list id', async () => {
    await expect(shareListAction('bad id', 'friend-1', AccessLevel.EDIT)).rejects.toThrow('Invalid list id.')
  })
})

describe('revokeAccessAction', () => {
  it('requires OWNER access to revoke', async () => {
    prismaMock.listAccess.delete.mockResolvedValue({} as any)
    await revokeAccessAction('list-1', 'friend-1')
    expect(verifyListAccess).toHaveBeenCalledWith('list-1', 'OWNER')
  })
})
