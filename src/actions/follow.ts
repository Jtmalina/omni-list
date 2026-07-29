'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { FollowType, MediaType, ItemType, ActivityType } from '@prisma/client'
import { discoverNewMedia, discoverNewGames, searchPersons, searchStudios } from '@/lib/media-api'
import { logActivity } from '@/lib/activity'

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
 * Core Sync Logic - Can be called by a Cron job or manually.
 * Mitigations:
 * 1. Only syncs users active in the last 7 days.
 * 2. Updates lastCheckedAt to prevent redundant daily calls.
 * 3. Deduplicates items by title/externalId.
 *
 * Items are created directly here rather than via createItem(): the cron runs
 * with no session, so createItem's auth()/verifyListAccess would throw
 * "Unauthorized" the moment a release was found and abort the whole run. The
 * sync is self-authorizing — it only ever writes to each user's own
 * autoAddListId. This also avoids a per-item auth() + verifyListAccess + a
 * findFirst dedupe query, which is where the run's cost was concentrated.
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
    const listId = user.autoAddListId
    if (!listId) continue

    // Load the auto-add list's existing items ONCE and dedupe in memory, instead
    // of a findFirst per discovered release (previously N queries per follow).
    const existing = await prisma.item.findMany({
      where: { listId },
      select: { title: true, media: { select: { externalId: true } } },
    })
    const existingTitles = new Set(existing.map((i) => i.title))
    const existingExternalIds = new Set(
      existing.map((i) => i.media?.externalId).filter((v): v is string => !!v)
    )

    for (const follow of user.follows) {
      const lastChecked = follow.lastCheckedAt || oneWeekAgo
      let discoveries: any[] = []

      if (follow.type === 'PERSON') {
        discoveries = await discoverNewMedia(follow.externalId, lastChecked)
      } else if (follow.type === 'STUDIO') {
        discoveries = await discoverNewGames(follow.externalId, lastChecked)
      }

      for (const item of discoveries) {
        const externalId = item.id ? String(item.id) : undefined
        if (existingTitles.has(item.title) || (externalId && existingExternalIds.has(externalId))) {
          continue
        }

        const created = await prisma.item.create({
          data: {
            title: item.title,
            description: item.overview || undefined,
            notes: `Auto-added because you follow ${follow.name}`,
            listId,
            type: ItemType.MEDIA,
            mediaType: follow.mediaType,
            // date-only ISO strings parse as UTC midnight; anchor to local midnight.
            dueDate: item.releaseDate ? new Date(item.releaseDate + 'T00:00:00') : undefined,
            media: {
              create: {
                externalId,
                posterPath: item.posterPath,
                rating: item.voteAverage || item.rating,
              },
            },
          },
        })

        await logActivity({
          userId: user.id,
          type: ActivityType.ITEM_CREATED,
          listId,
          itemId: created.id,
          itemTitle: created.title,
        })

        // Keep the in-memory dedupe sets current within this run.
        existingTitles.add(created.title)
        if (externalId) existingExternalIds.add(externalId)
        totalAdded++
      }
    }

    // Bump lastCheckedAt for all of this user's follows in one query instead of
    // one update per follow.
    if (user.follows.length > 0) {
      await prisma.follow.updateMany({
        where: { id: { in: user.follows.map((f) => f.id) } },
        data: { lastCheckedAt: new Date() },
      })
    }
  }

  return { success: true, addedCount: totalAdded }
}
