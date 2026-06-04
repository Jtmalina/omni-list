import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyListAccess } from './permissions'
import { auth } from '@/lib/auth'
import { AccessLevel } from '@prisma/client'
import prisma from '@/lib/prisma'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    list: {
      findUnique: vi.fn(),
    },
  },
}))

describe('Permissions Utility (verifyListAccess)', () => {
  const mockUserId = 'user-1'
  const mockListId = 'list-1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as any)
  })

  it('should allow the owner to perform any action', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      id: mockListId,
      userId: mockUserId,
      sharedWith: []
    } as any)

    const result = await verifyListAccess(mockListId, 'OWNER')
    expect(result).toBe(mockUserId)
  })

  it('should allow an EDIT collaborator to perform EDIT actions', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      id: mockListId,
      userId: 'other-user',
      sharedWith: [{ userId: mockUserId, accessLevel: AccessLevel.EDIT }]
    } as any)

    const result = await verifyListAccess(mockListId, 'EDIT')
    expect(result).toBe(mockUserId)
  })

  it('should block an EDIT collaborator from OWNER actions', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      id: mockListId,
      userId: 'other-user',
      sharedWith: [{ userId: mockUserId, accessLevel: AccessLevel.EDIT }]
    } as any)

    await expect(verifyListAccess(mockListId, 'OWNER')).rejects.toThrow('Only the owner can perform this action')
  })

  it('should block a VIEW collaborator from EDIT actions', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      id: mockListId,
      userId: 'other-user',
      sharedWith: [{ userId: mockUserId, accessLevel: AccessLevel.VIEW }]
    } as any)

    await expect(verifyListAccess(mockListId, 'EDIT')).rejects.toThrow('Edit access required')
  })

  it('should throw error if list does not exist', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(null)
    await expect(verifyListAccess(mockListId, 'VIEW')).rejects.toThrow('List not found')
  })

  it('should throw error if user is not authorized at all', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      id: mockListId,
      userId: 'other-user',
      sharedWith: [] // User not in list
    } as any)

    await expect(verifyListAccess(mockListId, 'VIEW')).rejects.toThrow('Access denied')
  })
})
