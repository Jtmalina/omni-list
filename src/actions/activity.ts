'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function getActivitiesAction() {
  const session = await auth()
  if (!session?.user?.id) return []

  // Fetch activities for:
  // 1. Lists the user owns
  // 2. Lists shared with the user
  // 3. Social actions like friend acceptance
  
  const userId = session.user.id

  return await prisma.activity.findMany({
    where: {
      OR: [
        { userId: userId }, // Their own actions
        { list: { userId: userId } }, // Actions on their lists by others
        { list: { sharedWith: { some: { userId: userId } } } } // Actions on lists shared with them
      ]
    },
    include: {
      user: {
        select: { id: true, name: true, image: true, email: true }
      },
      list: {
        select: { id: true, title: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })
}
