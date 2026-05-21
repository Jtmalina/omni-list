'use server'

import prisma from '@/lib/prisma'
import { ItemStatus, ItemType, MediaType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'

async function verifyListOwnership(listId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  const list = await prisma.list.findUnique({
    where: { id: listId, userId: session.user.id }
  })
  if (!list) throw new Error('Unauthorized')
  return session.user.id
}

export async function createItem(data: {
  title: string
  notes?: string
  listId: string
  type: ItemType
  mediaType?: MediaType
  dueDate?: Date
}) {
  await verifyListOwnership(data.listId)
  await prisma.item.create({
    data: {
      ...data,
    },
  })
  revalidatePath(`/list/${data.listId}`)
}

export async function getItems(listId: string) {
  await verifyListOwnership(listId)
  return await prisma.item.findMany({
    where: { listId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateItemStatus(id: string, status: ItemStatus, listId: string) {
  await verifyListOwnership(listId)
  await prisma.item.update({
    where: { id },
    data: { status },
  })
  revalidatePath(`/list/${listId}`)
}

export async function deleteItem(id: string, listId: string) {
  await verifyListOwnership(listId)
  await prisma.item.delete({
    where: { id },
  })
  revalidatePath(`/list/${listId}`)
}
