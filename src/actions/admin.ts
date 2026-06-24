'use server'

import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

// Aggregated, app-level metrics for the admin dashboard. Admin-gated.
export async function getAdminStatsAction() {
  await requireAdmin()

  const now = Date.now()
  const d24 = new Date(now - 24 * 60 * 60 * 1000)
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000)
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    newUsers7,
    newUsers30,
    activeUsers7,
    logins24,
    totalLists,
    totalItems,
    completedItems,
    itemsByType,
    itemsByMediaType,
    acceptedFriendships,
    sharedLists,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: d7 } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: d24 } } }),
    prisma.list.count(),
    prisma.item.count(),
    prisma.item.count({ where: { status: 'COMPLETED' } }),
    prisma.item.groupBy({ by: ['type'], _count: true }),
    prisma.item.groupBy({ by: ['mediaType'], _count: true }),
    prisma.friendship.count({ where: { status: 'ACCEPTED' } }),
    prisma.listAccess.count(),
    prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { name: true, email: true, image: true } },
        list: { select: { title: true } },
      },
    }),
  ])

  return {
    totalUsers,
    newUsers7,
    newUsers30,
    activeUsers7,
    logins24,
    totalLists,
    totalItems,
    completedItems,
    itemsByType,
    itemsByMediaType,
    acceptedFriendships,
    sharedLists,
    recentActivity,
  }
}
