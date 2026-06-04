'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { AccessLevel } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { verifyListAccess } from '@/lib/permissions'

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export async function shareListAction(listId: string, friendId: string, accessLevel: AccessLevel) {
  // Only owner can share a list
  await verifyListAccess(listId, 'OWNER')

  await prisma.listAccess.upsert({
    where: {
      listId_userId: { listId, userId: friendId }
    },
    update: { accessLevel },
    create: {
      listId,
      userId: friendId,
      accessLevel
    }
  })

  revalidatePath(`/list/${listId}`)
  revalidatePath('/')
  return { success: true }
}

export async function revokeAccessAction(listId: string, userId: string) {
  // Only owner can revoke access
  await verifyListAccess(listId, 'OWNER')

  await prisma.listAccess.delete({
    where: {
      listId_userId: { listId, userId }
    }
  })

  revalidatePath(`/list/${listId}`)
  revalidatePath('/')
  return { success: true }
}

export async function getListCollaboratorsAction(listId: string) {
  // Anyone with access can see collaborators
  await verifyListAccess(listId, 'VIEW')

  return await prisma.listAccess.findMany({
    where: { listId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true }
      }
    }
  })
}
