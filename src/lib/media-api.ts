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

export async function searchMedia(query: string): Promise<MediaSearchResult[]> {
  const token = process.env.TMDB_API_KEY?.trim().replace(/^["']|["']$/g, '')

  if (!token || token === 'your-tmdb-api-key-here') {
    console.warn('TMDB API Key is missing or default.')
    return []
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`TMDB Search Error: ${response.status} ${response.statusText}`, errorBody)
      throw new Error(`TMDB returned ${response.status}: ${errorBody}`)
    }

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
    console.error('TMDB Search Fetch Failure:', error)
    throw error
  }
}

export async function searchGames(query: string): Promise<GameSearchResult[]> {
  const key = process.env.RAWG_API_KEY?.trim().replace(/^["']|["']$/g, '')

  if (!key || key === 'your-rawg-api-key-here') {
    console.warn('RAWG API Key is missing or default.')
    return []
  }

  try {
    const response = await fetch(
      `${RAWG_BASE_URL}/games?key=${encodeURIComponent(key)}&search=${encodeURIComponent(query)}&page_size=10`,
      {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`RAWG Search Error: ${response.status}`, errorBody)
      throw new Error(`RAWG returned ${response.status}: ${errorBody}`)
    }

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
    console.error('RAWG Search Fetch Failure:', error)
    throw error
  }
}

export async function getGameDetails(gameId: string): Promise<{ description: string } | null> {
  const key = process.env.RAWG_API_KEY?.trim().replace(/^["']|["']$/g, '')
  if (!key || key === 'your-rawg-api-key-here') return null

  try {
    const response = await fetch(
      `${RAWG_BASE_URL}/games/${gameId}?key=${encodeURIComponent(key)}`,
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
    console.error('RAWG Game Details Fetch Failure:', error)
    return null
  }
}

export async function getStreamingProviders(mediaId: string, mediaType: 'movie' | 'tv') {
  const token = process.env.TMDB_API_KEY?.trim().replace(/^["']|["']$/g, '')
  if (!token || token === 'your-tmdb-api-key-here') return null

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${mediaType}/${mediaId}/watch/providers`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`TMDB Providers Error: ${response.status} ${response.statusText} for ID ${mediaId}`, errorBody)
      return null
    }

    const data = await response.json()
    return data.results?.US || null
  } catch (error) {
    console.error('TMDB Providers Fetch Failure:', error)
    return null
  }
}
