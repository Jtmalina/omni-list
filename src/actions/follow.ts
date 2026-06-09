'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { FollowType, MediaType, ItemType } from '@prisma/client'
import { discoverNewMedia, discoverNewGames, searchPersons, searchStudios } from '@/lib/media-api'
import { createItem } from './item'

export async function searchPersonsAction(query: string) {
  if (!query.trim()) return []
  return searchPersons(query)
}

export async function searchStudiosAction(query: string) {
  if (!query.trim()) return []
  return searchStudios(query)
}

export async function toggleFollowAction(data: {
  externalId: string
  type: FollowType
  mediaType: MediaType
  name: string
  knownFor?: string | null
  posterPath?: string | null
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const existing = await prisma.follow.findUnique({
    where: {
      userId_externalId_type: {
        userId: session.user.id,
        externalId: data.externalId,
        type: data.type
      }
    }
  })

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } })
  } else {
    await prisma.follow.create({
      data: {
        ...data,
        userId: session.user.id
      }
    })
  }

  revalidatePath('/')
  return { success: true, isFollowing: !existing }
}

export async function getFollowsAction() {
  const session = await auth()
  if (!session?.user?.id) return []

  return prisma.follow.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' }
  })
}

/**
 * Core Sync Logic - Can be called by a Cron job or manually
 * Mitigations:
 * 1. Only syncs users active in the last 7 days.
 * 2. Updates lastCheckedAt to prevent redundant daily calls.
 * 3. Deduplicates items by title/externalId.
 */
export async function syncUpcomingReleasesAction(userId?: string) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  
  // Find users to sync: 
  // - If specific userId provided, just that one.
  // - Otherwise, all users logged in within the last 7 days.
  const usersToSync = await prisma.user.findMany({
    where: {
      id: userId || undefined,
      lastLoginAt: { gte: oneWeekAgo },
      autoAddListId: { not: null }
    },
    include: {
      follows: true
    }
  })

  let totalAdded = 0

  for (const user of usersToSync) {
    if (!user.autoAddListId) continue

    for (const follow of user.follows) {
      const lastChecked = follow.lastCheckedAt || oneWeekAgo
      let discoveries: any[] = []

      if (follow.type === 'PERSON') {
        discoveries = await discoverNewMedia(follow.externalId, lastChecked)
      } else if (follow.type === 'STUDIO') {
        discoveries = await discoverNewGames(follow.externalId, lastChecked)
      }

      for (const item of discoveries) {
        // Check if already in this user's lists (dedupe)
        const exists = await prisma.item.findFirst({
          where: {
            listId: user.autoAddListId,
            OR: [
              { title: item.title },
              { media: { externalId: item.id } }
            ]
          }
        })

        if (!exists) {
          await createItem({
            title: item.title,
            notes: `Auto-added because you follow ${follow.name}`,
            listId: user.autoAddListId,
            type: ItemType.MEDIA,
            mediaType: follow.mediaType,
            dueDate: item.releaseDate ? new Date(item.releaseDate) : undefined,
            mediaMetadata: {
              externalId: item.id,
              posterPath: item.posterPath,
              rating: item.voteAverage || item.rating,
            }
          })
          totalAdded++
        }
      }

      // Update last checked time
      await prisma.follow.update({
        where: { id: follow.id },
        data: { lastCheckedAt: new Date() }
      })
    }
  }

  return { success: true, addedCount: totalAdded }
}
