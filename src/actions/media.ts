'use server'

import { searchMedia, searchGames, getGameDetails, getStreamingProviders } from '@/lib/media-api'

export async function searchMediaAction(query: string) {
  if (!query || query.length < 2) return []
  return await searchMedia(query)
}

export async function searchGamesAction(query: string) {
  if (!query || query.length < 2) return []
  return await searchGames(query)
}

export async function fetchGameDetailsAction(gameId: string) {
  return await getGameDetails(gameId)
}

export async function fetchStreamingInfoAction(id: string, type: 'movie' | 'tv') {
  return await getStreamingProviders(id, type)
}
