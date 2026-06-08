const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const RAWG_BASE_URL = 'https://api.rawg.io/api'

export interface GameSearchResult {
  id: string
  title: string
  overview: string
  posterPath: string | null
  releaseDate: string
  mediaType: 'game'
  rating: number
  metacritic: number | null
  esrb: string | null
  platforms: string[]
  stores: string[]
}

export interface MediaSearchResult {
  id: string
  title: string
  overview: string
  posterPath: string | null
  releaseDate: string
  mediaType: 'movie' | 'tv'
  voteAverage: number
}

export interface MediaCredit {
  id: string
  name: string
  role: string // 'Director', 'Actor', etc.
  profilePath: string | null
  type: 'PERSON'
}

export interface GameCreator {
  id: string
  name: string
  profilePath: string | null
  type: 'STUDIO'
}

function getTMDBHeaders() {
  const token = process.env.TMDB_API_KEY?.trim().replace(/^["']|["']$/g, '')
  if (!token || token === 'your-tmdb-api-key-here') {
    throw new Error('TMDB API Key is missing.')
  }
  return {
    accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function getRAWGKey() {
  const key = process.env.RAWG_API_KEY?.trim().replace(/^["']|["']$/g, '')
  if (!key || key === 'your-rawg-api-key-here') {
    throw new Error('RAWG API Key is missing.')
  }
  return key
}

export async function searchMedia(query: string): Promise<MediaSearchResult[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
      {
        headers: getTMDBHeaders(),
        cache: 'no-store',
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return data.results
      .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
      .map((r: any) => ({
        id: r.id.toString(),
        title: r.title || r.name,
        overview: r.overview,
        posterPath: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
        releaseDate: r.release_date || r.first_air_date,
        mediaType: r.media_type,
        voteAverage: r.vote_average,
      }))
  } catch (error) {
    console.error('TMDB Search Failure:', error)
    return []
  }
}

export async function searchGames(query: string): Promise<GameSearchResult[]> {
  try {
    const key = getRAWGKey()
    const response = await fetch(
      `${RAWG_BASE_URL}/games?key=${key}&search=${encodeURIComponent(query)}&page_size=10`,
      {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return (data.results ?? []).map((r: any) => ({
      id: r.id.toString(),
      title: r.name,
      overview: (r.genres as any[] ?? []).map((g: any) => g.name).join(', '),
      posterPath: r.background_image ?? null,
      releaseDate: r.released ?? '',
      mediaType: 'game' as const,
      rating: r.rating ?? 0,
      metacritic: r.metacritic ?? null,
      esrb: r.esrb_rating?.name ?? null,
      platforms: (r.platforms as any[] ?? []).map((p: any) => p.platform.name as string),
      stores: (r.stores as any[] ?? []).map((s: any) => s.store.name as string),
    }))
  } catch (error) {
    console.error('RAWG Search Failure:', error)
    return []
  }
}

export async function getMediaCredits(id: string, type: 'movie' | 'tv'): Promise<MediaCredit[]> {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/${type}/${id}/credits`, {
      headers: getTMDBHeaders(),
      cache: 'no-store',
    })
    if (!response.ok) return []
    const data = await response.json()
    
    const directors = (data.crew || [])
      .filter((c: any) => c.job === 'Director')
      .map((c: any) => ({
        id: c.id.toString(),
        name: c.name,
        role: 'Director',
        profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        type: 'PERSON' as const
      }))

    const actors = (data.cast || [])
      .slice(0, 5)
      .map((c: any) => ({
        id: c.id.toString(),
        name: c.name,
        role: 'Actor',
        profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        type: 'PERSON' as const
      }))

    return [...directors, ...actors]
  } catch (error) {
    console.error('TMDB Credits Failure:', error)
    return []
  }
}

export async function getGameCreators(gameId: string): Promise<GameCreator[]> {
  try {
    const key = getRAWGKey()
    const response = await fetch(`${RAWG_BASE_URL}/games/${gameId}/development-team?key=${key}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return []
    const data = await response.json()
    
    // Developer studios are also available directly on the game object
    const gameResp = await fetch(`${RAWG_BASE_URL}/games/${gameId}?key=${key}`)
    if (!gameResp.ok) return []
    const gameData = await gameResp.json()

    return (gameData.developers || []).map((d: any) => ({
      id: d.id.toString(),
      name: d.name,
      profilePath: d.image_background ?? null,
      type: 'STUDIO' as const
    }))
  } catch (error) {
    console.error('RAWG Creators Failure:', error)
    return []
  }
}

export async function discoverNewMedia(personId: string, lastChecked: Date): Promise<MediaSearchResult[]> {
  try {
    const dateStr = lastChecked.toISOString().split('T')[0]
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/movie?with_people=${personId}&primary_release_date.gte=${dateStr}&sort_by=primary_release_date.desc`,
      {
        headers: getTMDBHeaders(),
        cache: 'no-store',
      }
    )
    if (!response.ok) return []
    const data = await response.json()
    return data.results.map((r: any) => ({
      id: r.id.toString(),
      title: r.title,
      overview: r.overview,
      posterPath: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      releaseDate: r.release_date,
      mediaType: 'movie' as const,
      voteAverage: r.vote_average,
    }))
  } catch (error) {
    console.error('TMDB Discovery Failure:', error)
    return []
  }
}

export async function discoverNewGames(studioId: string, lastChecked: Date): Promise<GameSearchResult[]> {
  try {
    const key = getRAWGKey()
    const dateStr = lastChecked.toISOString().split('T')[0]
    const response = await fetch(
      `${RAWG_BASE_URL}/games?key=${key}&developers=${studioId}&dates=${dateStr},2030-12-31&ordering=-released`,
      {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      }
    )
    if (!response.ok) return []
    const data = await response.json()
    return (data.results ?? []).map((r: any) => ({
      id: r.id.toString(),
      title: r.name,
      overview: (r.genres as any[] ?? []).map((g: any) => g.name).join(', '),
      posterPath: r.background_image ?? null,
      releaseDate: r.released ?? '',
      mediaType: 'game' as const,
      rating: r.rating ?? 0,
      metacritic: r.metacritic ?? null,
      esrb: r.esrb_rating?.name ?? null,
      platforms: (r.platforms as any[] ?? []).map((p: any) => p.platform.name as string),
      stores: (r.stores as any[] ?? []).map((s: any) => s.store.name as string),
    }))
  } catch (error) {
    console.error('RAWG Discovery Failure:', error)
    return []
  }
}

export async function getGameDetails(gameId: string): Promise<{ description: string } | null> {
  try {
    const key = getRAWGKey()
    const response = await fetch(
      `${RAWG_BASE_URL}/games/${gameId}?key=${key}`,
      {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      }
    )
    if (!response.ok) return null
    const data = await response.json()
    const raw: string = data.description_raw ?? ''
    return { description: raw.length > 1000 ? raw.slice(0, 1000) + '…' : raw }
  } catch (error) {
    return null
  }
}

export async function getStreamingProviders(mediaId: string, mediaType: 'movie' | 'tv') {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${mediaType}/${mediaId}/watch/providers`,
      {
        headers: getTMDBHeaders(),
        cache: 'no-store',
      }
    )
    if (!response.ok) return null
    const data = await response.json()
    return data.results?.US || null
  } catch (error) {
    return null
  }
}
