'use client'

import useSWR, { mutate } from 'swr'
import { getFriendsAction, getPendingRequestsAction } from '@/actions/friends'
import { getFollowsAction } from '@/actions/follow'
import { getServarrConfigAction } from '@/actions/servarr'

// Centralised SWR hooks for the navbar menus (friends, follows, Servarr config).
//
// These dialogs are always mounted in the Navbar (just closed), so calling these
// hooks prefetches the data on page load and caches it. Opening a menu is then
// instant, and SWR revalidates in the background. Mutations call the refresh*
// helpers to update the shared cache.

export const appDataKeys = {
  friends: 'friends',
  pendingRequests: 'pending-requests',
  follows: 'follows',
  servarrConfig: 'servarr-config',
} as const

const fresh = { dedupingInterval: 30_000 }
const stable = { revalidateOnFocus: false, dedupingInterval: 60_000 }

export function useFriends() {
  return useSWR(appDataKeys.friends, () => getFriendsAction(), fresh)
}

export function usePendingRequests() {
  return useSWR(appDataKeys.pendingRequests, () => getPendingRequestsAction(), fresh)
}

export function useFollows() {
  return useSWR(appDataKeys.follows, () => getFollowsAction(), fresh)
}

export function useServarrConfig() {
  return useSWR(appDataKeys.servarrConfig, () => getServarrConfigAction(), stable)
}

export const refreshFriends = () => {
  mutate(appDataKeys.friends)
  mutate(appDataKeys.pendingRequests)
}
export const refreshFollows = () => mutate(appDataKeys.follows)
export const refreshServarrConfig = () => mutate(appDataKeys.servarrConfig)
