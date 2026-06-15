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

export async function fetchTVSeasonsAction(tmdbId: string): Promise<{ seasonNumber: number; name: string; episodeCount: number }[]> {
  const token = process.env.TMDB_API_KEY?.trim().replace(/^["']|["']$/g, '')
  if (!token) return []
  const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
    headers: { accept: 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.seasons ?? [])
    .filter((s: any) => s.season_number > 0) // exclude specials (season 0)
    .map((s: any) => ({ seasonNumber: s.season_number, name: s.name, episodeCount: s.episode_count }))
}
