'use server'

import { searchMedia, getStreamingProviders } from '@/lib/media-api'

export async function searchMediaAction(query: string) {
  if (!query || query.length < 2) return []
  return await searchMedia(query)
}

export async function fetchStreamingInfoAction(id: string, type: 'movie' | 'tv') {
  return await getStreamingProviders(id, type)
}
