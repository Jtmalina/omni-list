import prisma from './prisma'
import { ActivityType } from '@prisma/client'

export async function logActivity(data: {
  userId: string
  type: ActivityType
  listId?: string
  itemId?: string
  itemTitle?: string
  metadata?: any
}) {
  try {
    return await prisma.activity.create({
      data: {
        userId: data.userId,
        type: data.type,
        listId: data.listId,
        itemId: data.itemId,
        itemTitle: data.itemTitle,
        metadata: data.metadata || {},
      }
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}
