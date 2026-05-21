import { PrismaClient } from '@prisma/client'
import { vi, beforeEach } from 'vitest'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'

// 1. Define the mock
export const prismaMock = mockDeep<PrismaClient>()

// 2. Intercept ALL imports of @/lib/prisma
vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}))

// 3. Mock Next.js cache functions (they crash in unit tests)
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

beforeEach(() => {
  mockReset(prismaMock)
})
