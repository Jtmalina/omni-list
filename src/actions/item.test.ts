import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '@/test/prisma-mock'
import { auth } from '@/lib/auth'
import { verifyListAccess } from '@/lib/permissions'
import { createItem, updateItemStatus, deleteItem } from './item'
import { ItemStatus } from '@prisma/client'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/permissions', () => ({ verifyListAccess: vi.fn() }))
vi.mock('@/lib/activity', () => ({ logActivity: vi.fn() }))

const USER = 'user-1'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ user: { id: USER } } as any)
  vi.mocked(verifyListAccess).mockResolvedValue(USER)
})

describe('createItem', () => {
  it('rejects an unauthenticated caller', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    await expect(createItem({ title: 'x', listId: 'list-1', type: 'TASK' } as any)).rejects.toThrow('Unauthorized')
  })

  it('requires EDIT access on the target list', async () => {
    prismaMock.item.create.mockResolvedValue({ id: 'item-1', title: 'x' } as any)
    await createItem({ title: 'x', listId: 'list-1', type: 'TASK' } as any)
    expect(verifyListAccess).toHaveBeenCalledWith('list-1', 'EDIT')
  })

  it('does not write the item when access is denied', async () => {
    vi.mocked(verifyListAccess).mockRejectedValue(new Error('Edit access required'))
    await expect(createItem({ title: 'x', listId: 'list-1', type: 'TASK' } as any)).rejects.toThrow('Edit access required')
    expect(prismaMock.item.create).not.toHaveBeenCalled()
  })
})

describe('updateItemStatus', () => {
  it('requires EDIT access', async () => {
    prismaMock.item.update.mockResolvedValue({ id: 'item-1', title: 'x' } as any)
    await updateItemStatus('item-1', ItemStatus.COMPLETED, 'list-1')
    expect(verifyListAccess).toHaveBeenCalledWith('list-1', 'EDIT')
  })
})

describe('deleteItem', () => {
  it('requires EDIT access and deletes the item', async () => {
    prismaMock.item.findUnique.mockResolvedValue({ id: 'item-1', title: 'x' } as any)
    prismaMock.item.delete.mockResolvedValue({ id: 'item-1' } as any)
    await deleteItem('item-1', 'list-1')
    expect(verifyListAccess).toHaveBeenCalledWith('list-1', 'EDIT')
    expect(prismaMock.item.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } })
  })
})
