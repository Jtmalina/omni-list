'use client'

import useSWR, { mutate } from 'swr'
import { getFriendsAction, getPendingRequestsAction } from '@/actions/friends'
import { getFollowsAction } from '@/actions/follow'
import { getServarrConfigAction } from '@/actions/servarr'
import { getUserSettingsAction } from '@/actions/user'
import { getLists } from '@/actions/list'
import { getTrendingAction, getUpcomingAction, getRecommendationsAction } from '@/actions/media'
import { fresh, stable, discoverOpts } from './swrOptions'

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
  userSettings: 'user-settings',
  lists: 'lists',
  trending: 'discover-trending',
  upcoming: 'discover-upcoming',
  recommendations: 'discover-recommendations',
} as const

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

export function useUserSettings() {
  return useSWR(appDataKeys.userSettings, () => getUserSettingsAction(), stable)
}

export function useLists() {
  return useSWR(appDataKeys.lists, () => getLists(), fresh)
}

// Discover feed. `enabled` gates fetching to when the Discover tab is open;
// results are still cached, so reopening the tab is instant. Trending/upcoming
// are global and rarely change; recommendations track the user's library and
// are invalidated by refreshLibrary() whenever items change.
export function useTrending(enabled: boolean) {
  return useSWR(enabled ? appDataKeys.trending : null, () => getTrendingAction(), discoverOpts)
}

export function useUpcoming(enabled: boolean) {
  return useSWR(enabled ? appDataKeys.upcoming : null, () => getUpcomingAction(), discoverOpts)
}

export function useRecommendations(enabled: boolean) {
  return useSWR(enabled ? appDataKeys.recommendations : null, () => getRecommendationsAction(), {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
}

export const refreshFriends = () => {
  mutate(appDataKeys.friends)
  mutate(appDataKeys.pendingRequests)
}
export const refreshFollows = () => mutate(appDataKeys.follows)
export const refreshServarrConfig = () => mutate(appDataKeys.servarrConfig)
export const refreshUserSettings = () => mutate(appDataKeys.userSettings)
export const refreshLists = () => mutate(appDataKeys.lists)

// Recommendations are derived from a TMDB/RAWG fetch, so coalesce rapid
// invalidations (e.g. a bulk edit) into a single refresh. Because the
// recommendations hook is only subscribed while the Discover tab is open,
// this is a no-op network-wise unless you're actually viewing the feed.
let recTimer: ReturnType<typeof setTimeout> | null = null
export const refreshRecommendations = () => {
  if (recTimer) clearTimeout(recTimer)
  recTimer = setTimeout(() => {
    recTimer = null
    mutate(appDataKeys.recommendations)
  }, 1500)
}

// Anything that changes the library (add/edit/delete/complete an item, or
// add/remove/rename a list) should call this so list counts and the
// recommendations feed stay in sync. List counts refresh immediately (cheap
// DB query); recommendations refresh is debounced.
export const refreshLibrary = () => {
  mutate(appDataKeys.lists)
  refreshRecommendations()
}
