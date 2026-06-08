'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { syncUpcomingReleasesAction } from './follow'

export async function updateUserAutomationSettingsAction(data: {
  autoAddListId: string | null
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await prisma.user.update({
    where: { id: session.user.id },
    data: { autoAddListId: data.autoAddListId }
  })

  revalidatePath('/')
  return { success: true }
}

export async function getUserSettingsAction() {
  const session = await auth()
  if (!session?.user?.id) return null

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      autoAddListId: true,
      lastLoginAt: true
    }
  })
}

export async function syncNowAction() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  return syncUpcomingReleasesAction(session.user.id)
}
