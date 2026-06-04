'use server'

import prisma from '@/lib/prisma'
import { ItemStatus, ItemType, MediaType, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { verifyListAccess } from '@/lib/permissions'

export async function createItem(data: {
  title: string
  notes?: string
  listId: string
  type: ItemType
  mediaType?: MediaType
  dueDate?: Date
  mediaMetadata?: {
    posterPath?: string
    rating?: number
    externalId?: string
    streamingInfo?: Record<string, unknown>
  }
}) {
  try {
    await verifyListAccess(data.listId, 'EDIT')
    const { mediaMetadata, ...itemData } = data
    
    await prisma.item.create({
      data: {
        ...itemData,
        media: mediaMetadata ? {
          create: {
            posterPath: mediaMetadata.posterPath,
            rating: mediaMetadata.rating,
            externalId: mediaMetadata.externalId,
            streamingInfo: mediaMetadata.streamingInfo as Prisma.InputJsonValue | undefined,
          }
        } : undefined
      },
    })
    revalidatePath(`/list/${data.listId}`)
  } catch (error) {
    console.error('Error creating item:', error)
    throw error
  }
}

export async function getItems(listId: string) {
  await verifyListAccess(listId, 'VIEW')
  return await prisma.item.findMany({
    where: { listId },
    include: {
      media: true
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateItemStatus(id: string, status: ItemStatus, listId: string) {
  await verifyListAccess(listId, 'EDIT')
  await prisma.item.update({
    where: { id },
    data: { status },
  })
  revalidatePath(`/list/${listId}`)
}

export async function deleteItem(id: string, listId: string) {
  await verifyListAccess(listId, 'EDIT')
  await prisma.item.delete({
    where: { id },
  })
  revalidatePath(`/list/${listId}`)
}
