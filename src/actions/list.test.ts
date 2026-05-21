import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '@/test/prisma-mock' // Import the mock first to ensure it's registered
import { createList, getLists } from './list'

// Mock the auth function
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: 'test-user-id' } })),
}))

describe('list actions', () => {
  it('creates a new list for the authenticated user', async () => {
    // @ts-ignore
    prismaMock.list.create.mockResolvedValue({ id: '1' })

    await createList('Test List')

    expect(prismaMock.list.create).toHaveBeenCalledWith({
      data: {
        title: 'Test List',
        type: 'TODO',
        userId: 'test-user-id',
      },
    })
  })

  it('fetches only the lists belonging to the user', async () => {
    // @ts-ignore
    prismaMock.list.findMany.mockResolvedValue([])

    await getLists()

    expect(prismaMock.list.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'test-user-id' },
      })
    )
  })
})
