'use server'

import prisma from '@/lib/prisma'
import { ItemStatus, ItemType, MediaType, Prisma, ActivityType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { verifyListAccess } from '@/lib/permissions'
import { logActivity } from '@/lib/activity'

export async function createItem(data: {
  title: string
  notes?: string
  listId: string
  type: ItemType
  mediaType?: MediaType
  dueDate?: Date
  color?: string
  tags?: string[]
  mediaMetadata?: {
    posterPath?: string
    rating?: number
    externalId?: string
    streamingInfo?: Record<string, unknown>
  }
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  try {
    await verifyListAccess(data.listId, 'EDIT')
    const { mediaMetadata, ...itemData } = data
    
    const item = await prisma.item.create({
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

    // Log Activity
    await logActivity({
      userId: session.user.id,
      type: ActivityType.ITEM_CREATED,
      listId: data.listId,
      itemId: item.id,
      itemTitle: item.title
    })

    revalidatePath(`/list/${data.listId}`)
  } catch (error) {
    console.error('Error creating item:', error)
    throw error
  }
}

export async function updateItem(id: string, data: {
  title?: string
  notes?: string
  dueDate?: Date | null
  color?: string | null
  tags?: string[]
  status?: ItemStatus
  listId: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  try {
    await verifyListAccess(data.listId, 'EDIT')
    
    const item = await prisma.item.update({
      where: { id },
      data: {
        title: data.title,
        notes: data.notes,
        dueDate: data.dueDate,
        color: data.color,
        tags: data.tags,
        status: data.status,
      },
    })

    // If status changed to COMPLETED, log it
    if (data.status === ItemStatus.COMPLETED) {
      await logActivity({
        userId: session.user.id,
        type: ActivityType.ITEM_COMPLETED,
        listId: data.listId,
        itemId: item.id,
        itemTitle: item.title
      })
    }

    revalidatePath(`/list/${data.listId}`)
  } catch (error) {
    console.error('Error updating item:', error)
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
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await verifyListAccess(listId, 'EDIT')
  const item = await prisma.item.update({
    where: { id },
    data: { status },
  })

  if (status === ItemStatus.COMPLETED) {
    await logActivity({
      userId: session.user.id,
      type: ActivityType.ITEM_COMPLETED,
      listId,
      itemId: item.id,
      itemTitle: item.title
    })
  }

  revalidatePath(`/list/${listId}`)
}

export async function deleteItem(id: string, listId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await verifyListAccess(listId, 'EDIT')
  const item = await prisma.item.findUnique({ where: { id } })
  
  if (item) {
    await logActivity({
      userId: session.user.id,
      type: ActivityType.ITEM_DELETED,
      listId,
      itemTitle: item.title
    })
    
    await prisma.item.delete({
      where: { id },
    })
  }

  revalidatePath(`/list/${listId}`)
}
