'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ListType } from '@prisma/client'

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
  return await prisma.list.findMany({
    where: { userId },
    include: {
      _count: {
        select: { items: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function deleteList(id: string) {
  const userId = await getUserId()
  
  // Verify ownership
  const list = await prisma.list.findUnique({
    where: { id, userId }
  })
  if (!list) throw new Error('Unauthorized')

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
