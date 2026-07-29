'use client'

import useSWR from 'swr'
import { getMediaStatusAction } from '@/actions/servarr'

export interface MediaStatus {
  inLibrary: boolean
  hasFile: boolean
  progress: number | null
  serverId: number | null
}

export const POLL_MS = 15_000

// A status is only worth polling while a download is actively in progress —
// `progress` is a number then, and `null` when idle / in library / not found.
// When idle we return 0 so SWR fetches once and stops.
//
// This is the crux of the CPU fix: the previous setInterval closed over a stale
// `status` (never in the effect deps), so its "only poll while downloading" guard
// was always true and it hammered the server every 15s forever, per card.
export function pollIntervalFor(status: MediaStatus | null | undefined): number {
  return status?.progress != null ? POLL_MS : 0
}

const canCheck = (mediaType: string | null | undefined) =>
  mediaType === 'MOVIE' || mediaType === 'SHOW'

export function useMediaStatus(
  itemId: string,
  mediaType: string | null | undefined,
  enabled: boolean
) {
  // A null key tells SWR not to fetch at all (disabled, or a non-Servarr type).
  const active = enabled && canCheck(mediaType)

  const { data, error, isValidating, mutate } = useSWR<MediaStatus | null>(
    active ? ['media-status', itemId] : null,
    () => getMediaStatusAction(itemId),
    {
      revalidateOnFocus: false,
      dedupingInterval: POLL_MS,
      // Poll only while downloading; otherwise this resolves to 0 (fetch once).
      refreshInterval: pollIntervalFor,
    }
  )

  return {
    status: data ?? null,
    loading: isValidating,
    error: error ? (error.message || 'Could not reach server') : null,
    refresh: () => mutate(),
  }
}
