'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ListType } from '@prisma/client'
import { verifyListAccess } from '@/lib/permissions'

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export async function createList(title: string, type: ListType = ListType.TODO) {
  const userId = await getUserId()
  await prisma.list.create({
    data: {
      title,
      type,
      userId,
    },
  })
  revalidatePath('/')
}

export async function getLists() {
  const userId = await getUserId()
  
  // Get lists owned by user OR shared with user
  return await prisma.list.findMany({
    where: {
      OR: [
        { userId },
        { sharedWith: { some: { userId } } }
      ]
    },
    include: {
      _count: {
        select: { items: true },
      },
      user: {
        select: { name: true, email: true }
      },
      sharedWith: {
        where: { userId },
        select: { accessLevel: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function deleteList(id: string) {
  // Only owner can delete a list
  await verifyListAccess(id, 'OWNER')

  // First delete items in the list
  await prisma.item.deleteMany({
    where: { listId: id }
  })
  // Then delete the list
  await prisma.list.delete({
    where: { id },
  })
  revalidatePath('/')
}
