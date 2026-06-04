import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { AccessLevel } from '@prisma/client'

export type RequiredAccess = 'OWNER' | 'EDIT' | 'VIEW'

/**
 * Verifies if the current user has the required access level for a list.
 * Returns the userId if successful, throws an error otherwise.
 */
export async function verifyListAccess(listId: string, required: RequiredAccess) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error('Unauthorized')

  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      sharedWith: {
        where: { userId }
      }
    }
  })

  if (!list) throw new Error('List not found')

  // Owner always has access
  if (list.userId === userId) return userId

  // If we only need OWNER access and the user is not the owner
  if (required === 'OWNER') throw new Error('Only the owner can perform this action')

  const access = list.sharedWith[0]
  if (!access) throw new Error('Access denied')

  // If EDIT access is required, check if user has it
  if (required === 'EDIT' && access.accessLevel !== AccessLevel.EDIT) {
    throw new Error('Edit access required')
  }

  // VIEW access is the minimum, which they have if they are in sharedWith
  return userId
}
