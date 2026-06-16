'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { AccessLevel, ActivityType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { verifyListAccess } from '@/lib/permissions'
import { logActivity } from '@/lib/activity'
import { idSchema, parseOrThrow } from '@/lib/validation'
import { z } from 'zod'

const accessLevelSchema = z.enum(['VIEW', 'EDIT'])

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export async function shareListAction(listId: string, friendId: string, accessLevel: AccessLevel) {
  const currentUserId = await getUserId()
  parseOrThrow(idSchema, listId, 'list id')
  parseOrThrow(idSchema, friendId, 'friend id')
  parseOrThrow(accessLevelSchema, accessLevel, 'access level')
  // Only owner can share a list
  await verifyListAccess(listId, 'OWNER')

  const [listAccess, list, friend] = await Promise.all([
    prisma.listAccess.upsert({
      where: {
        listId_userId: { listId, userId: friendId }
      },
      update: { accessLevel },
      create: {
        listId,
        userId: friendId,
        accessLevel
      }
    }),
    prisma.list.findUnique({ where: { id: listId } }),
    prisma.user.findUnique({ where: { id: friendId } })
  ])

  // Log Activity
  if (list && friend) {
    await logActivity({
      userId: currentUserId,
      type: ActivityType.LIST_SHARED,
      listId: listId,
      metadata: {
        friendId: friend.id,
        friendName: friend.name || friend.email,
        listTitle: list.title
      }
    })
  }

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
