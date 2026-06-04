'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { FriendshipStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export async function sendFriendRequestAction(receiverEmail: string) {
  const senderId = await getUserId()
  
  const receiver = await prisma.user.findUnique({
    where: { email: receiverEmail }
  })

  if (!receiver) {
    throw new Error('User not found')
  }

  if (receiver.id === senderId) {
    throw new Error('You cannot add yourself as a friend')
  }

  // Check if friendship already exists
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { senderId, receiverId: receiver.id },
        { senderId: receiver.id, receiverId: senderId }
      ]
    }
  })

  if (existing) {
    if (existing.status === FriendshipStatus.ACCEPTED) {
      throw new Error('You are already friends')
    } else {
      throw new Error('A friend request is already pending')
    }
  }

  await prisma.friendship.create({
    data: {
      senderId,
      receiverId: receiver.id,
      status: FriendshipStatus.PENDING
    }
  })

  revalidatePath('/')
  return { success: true }
}

export async function getFriendsAction() {
  const userId = await getUserId()

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { senderId: userId, status: FriendshipStatus.ACCEPTED },
        { receiverId: userId, status: FriendshipStatus.ACCEPTED }
      ]
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true, image: true }
      },
      receiver: {
        select: { id: true, name: true, email: true, image: true }
      }
    }
  })

  return friendships.map(f => f.senderId === userId ? f.receiver : f.sender)
}

export async function getPendingRequestsAction() {
  const userId = await getUserId()

  return await prisma.friendship.findMany({
    where: {
      receiverId: userId,
      status: FriendshipStatus.PENDING
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true, image: true }
      }
    }
  })
}

export async function acceptFriendRequestAction(requestId: string) {
  const userId = await getUserId()

  const request = await prisma.friendship.findUnique({
    where: { id: requestId }
  })

  if (!request || request.receiverId !== userId) {
    throw new Error('Unauthorized or request not found')
  }

  await prisma.friendship.update({
    where: { id: requestId },
    data: { status: FriendshipStatus.ACCEPTED }
  })

  revalidatePath('/')
  return { success: true }
}

export async function rejectFriendRequestAction(requestId: string) {
  const userId = await getUserId()

  const request = await prisma.friendship.findUnique({
    where: { id: requestId }
  })

  if (!request || (request.receiverId !== userId && request.senderId !== userId)) {
    throw new Error('Unauthorized or request not found')
  }

  await prisma.friendship.delete({
    where: { id: requestId }
  })

  revalidatePath('/')
  return { success: true }
}
