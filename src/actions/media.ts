'use server'

import {
  searchMedia,
  searchGames,
  getGameDetails,
  getStreamingProviders,
  getMediaRecommendations,
  getGameGenres,
  getGamesByGenres,
  getTrendingMedia,
  getTrendingGames,
  getUpcomingMedia,
  getUpcomingGames,
  type MediaSearchResult,
  type GameSearchResult,
} from '@/lib/media-api'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

// Derives a stable rate-limit key from the current session (or 'anon').
async function rlKey(prefix: string): Promise<string> {
  const session = await auth()
  return `${prefix}:${session?.user?.id ?? 'anon'}`
}

export async function searchMediaAction(query: string) {
  if (!query || query.length < 2) return []
  if (!rateLimit(await rlKey('search'), 40, 10_000).ok) return []
  return await searchMedia(query)
}

export async function searchGamesAction(query: string) {
  if (!query || query.length < 2) return []
  if (!rateLimit(await rlKey('search'), 40, 10_000).ok) return []
  return await searchGames(query)
}

export async function fetchGameDetailsAction(gameId: string) {
  return await getGameDetails(gameId)
}

export async function fetchStreamingInfoAction(id: string, type: 'movie' | 'tv') {
  return await getStreamingProviders(id, type)
}

export async function getTrendingAction(): Promise<(MediaSearchResult | GameSearchResult)[]> {
  if (!rateLimit(await rlKey('feed'), 30, 60_000).ok) return []
  const [media, games] = await Promise.all([getTrendingMedia(), getTrendingGames()])
  return [...media.slice(0, 12), ...games.slice(0, 6)]
}

export async function getUpcomingAction(): Promise<(MediaSearchResult | GameSearchResult)[]> {
  if (!rateLimit(await rlKey('feed'), 30, 60_000).ok) return []
  const [media, games] = await Promise.all([getUpcomingMedia(), getUpcomingGames()])
  return [...media.slice(0, 12), ...games.slice(0, 6)]
}

// Recommends content based on the user's library. Seeds are chosen completed-first
// (strongest "I liked this" signal), then most-recently-added, capped per media type
// so movies/shows/games all contribute. Recommendations are aggregated across seeds —
// a title recommended by multiple seeds ranks higher — and anything already in the
// library is filtered out.
export async function getRecommendationsAction(): Promise<(MediaSearchResult | GameSearchResult)[]> {
  const session = await auth()
  if (!session?.user?.id) return []
  if (!rateLimit(`feed:${session.user.id}`, 30, 60_000).ok) return []

  const items = await prisma.item.findMany({
    where: {
      type: 'MEDIA',
      list: { userId: session.user.id },
      media: { externalId: { not: null } },
    },
    include: { media: true },
    orderBy: { createdAt: 'desc' },
  })
  if (items.length === 0) return []

  // Anything already in the library, keyed by type:externalId, to filter out.
  const existing = new Set(items.map(i => `${i.mediaType}:${i.media!.externalId}`))

  // Seed selection: completed first, then most recent; cap per type for diversity.
  const PER_TYPE = 4
  const sorted = [...items].sort((a, b) => {
    const ac = a.status === 'COMPLETED' ? 0 : 1
    const bc = b.status === 'COMPLETED' ? 0 : 1
    if (ac !== bc) return ac - bc
    return b.createdAt.getTime() - a.createdAt.getTime()
  })
  const perType: Record<string, typeof items> = { MOVIE: [], SHOW: [], GAME: [] }
  for (const it of sorted) {
    const t = it.mediaType
    if (t && perType[t] && perType[t].length < PER_TYPE) perType[t].push(it)
  }
  const seeds = [...perType.MOVIE, ...perType.SHOW, ...perType.GAME]

  // Aggregate recommendations with a score (frequency + a boost for completed seeds).
  const scores = new Map<string, { item: MediaSearchResult | GameSearchResult; score: number; rating: number }>()
  const add = (rec: MediaSearchResult | GameSearchResult, weight: number) => {
    const t = rec.mediaType === 'game' ? 'GAME' : rec.mediaType === 'movie' ? 'MOVIE' : 'SHOW'
    const key = `${t}:${rec.id}`
    if (existing.has(key)) return
    const rating = 'voteAverage' in rec ? rec.voteAverage : rec.rating
    const cur = scores.get(key)
    if (cur) cur.score += weight
    else scores.set(key, { item: rec, score: weight, rating })
  }

  // Movie/show recommendations via TMDB
  const mediaSeeds = seeds.filter(s => s.mediaType === 'MOVIE' || s.mediaType === 'SHOW')
  await Promise.all(mediaSeeds.map(async (s) => {
    const type = s.mediaType === 'MOVIE' ? 'movie' : 'tv'
    const recs = await getMediaRecommendations(s.media!.externalId!, type)
    const weight = s.status === 'COMPLETED' ? 2 : 1
    recs.forEach(r => add(r, weight))
  }))

  // Game recommendations via shared genres (RAWG free tier has no similar-games endpoint)
  const gameSeeds = seeds.filter(s => s.mediaType === 'GAME')
  if (gameSeeds.length > 0) {
    const genreLists = await Promise.all(gameSeeds.map(s => getGameGenres(s.media!.externalId!)))
    const genres = Array.from(new Set(genreLists.flat())).slice(0, 5)
    const gameRecs = await getGamesByGenres(genres)
    gameRecs.forEach(r => add(r, 1))
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score || b.rating - a.rating)
    .slice(0, 18)
    .map(s => s.item)
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
