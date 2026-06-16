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

export interface ExtendedMediaDetails extends MediaSearchResult {
  backdropPath: string | null
  genres: { id: number; name: string }[]
  tagline: string | null
  runtime?: number
  numberOfEpisodes?: number
  numberOfSeasons?: number
  status: string
  videos: { key: string; name: string; type: string }[]
  credits: MediaCredit[]
  recommendations: MediaSearchResult[]
  similar: MediaSearchResult[]
}

export interface ExtendedGameDetails extends GameSearchResult {
  description: string
  website: string | null
  developers: GameCreator[]
  publishers: { name: string }[]
  screenshots: string[]
  similarGames: GameSearchResult[]
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

export async function getExtendedMediaDetails(id: string, type: 'movie' | 'tv'): Promise<ExtendedMediaDetails | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${type}/${id}?append_to_response=videos,credits,recommendations,similar`,
      {
        headers: getTMDBHeaders(),
        cache: 'no-store',
      }
    )
    if (!response.ok) return null
    const data = await response.json()

    const mapResult = (r: any) => ({
      id: r.id.toString(),
      title: r.title || r.name,
      overview: r.overview,
      posterPath: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      releaseDate: r.release_date || r.first_air_date,
      mediaType: type,
      voteAverage: r.vote_average,
    })

    return {
      ...mapResult(data),
      backdropPath: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
      genres: data.genres || [],
      tagline: data.tagline,
      runtime: data.runtime,
      numberOfEpisodes: data.number_of_episodes,
      numberOfSeasons: data.number_of_seasons,
      status: data.status,
      videos: (data.videos?.results || [])
        .filter((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
        .map((v: any) => ({ key: v.key, name: v.name, type: v.type })),
      credits: [
        ...(data.credits?.crew || [])
          .filter((c: any) => c.job === 'Director')
          .map((c: any) => ({
            id: c.id.toString(),
            name: c.name,
            role: 'Director',
            profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
            type: 'PERSON' as const
          })),
        ...(data.credits?.cast || [])
          .slice(0, 10)
          .map((c: any) => ({
            id: c.id.toString(),
            name: c.name,
            role: c.character,
            profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
            type: 'PERSON' as const
          }))
      ],
      recommendations: (data.recommendations?.results || []).slice(0, 8).map(mapResult),
      similar: (data.similar?.results || []).slice(0, 8).map(mapResult),
    }
  } catch (error) {
    console.error('TMDB Extended Fetch Failure:', error)
    return null
  }
}

export async function getExtendedGameDetails(id: string): Promise<ExtendedGameDetails | null> {
  try {
    const key = getRAWGKey()
    const [gameData, screenData, similarData] = await Promise.all([
      fetch(`${RAWG_BASE_URL}/games/${id}?key=${key}`).then(r => r.json()),
      fetch(`${RAWG_BASE_URL}/games/${id}/screenshots?key=${key}`).then(r => r.json()),
      fetch(`${RAWG_BASE_URL}/games/${id}/game-series?key=${key}`).then(r => r.json()),
    ])

    const mapGame = (r: any) => ({
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
    })

    return {
      ...mapGame(gameData),
      description: gameData.description_raw || gameData.description,
      website: gameData.website,
      developers: (gameData.developers || []).map((d: any) => ({
        id: d.id.toString(),
        name: d.name,
        profilePath: d.image_background ?? null,
        type: 'STUDIO' as const
      })),
      publishers: gameData.publishers || [],
      screenshots: (screenData.results || []).map((s: any) => s.image),
      similarGames: (similarData.results || []).slice(0, 8).map(mapGame),
    }
  } catch (error) {
    console.error('RAWG Extended Fetch Failure:', error)
    return null
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

// ─── Recommendations ────────────────────────────────────────────────────────

// TMDB recommendations for a movie/show seed.
export async function getMediaRecommendations(id: string, type: 'movie' | 'tv'): Promise<MediaSearchResult[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${type}/${id}/recommendations?language=en-US&page=1`,
      { headers: getTMDBHeaders(), cache: 'no-store' }
    )
    if (!response.ok) return []
    const data = await response.json()
    return (data.results ?? [])
      .filter((r: any) => !r.media_type || r.media_type === 'movie' || r.media_type === 'tv')
      .map((r: any) => ({
        id: r.id.toString(),
        title: r.title || r.name,
        overview: r.overview ?? '',
        posterPath: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
        releaseDate: r.release_date || r.first_air_date || '',
        mediaType: (r.media_type === 'tv' || r.media_type === 'movie' ? r.media_type : type) as 'movie' | 'tv',
        voteAverage: r.vote_average ?? 0,
      }))
  } catch (error) {
    console.error('TMDB Recommendations Failure:', error)
    return []
  }
}

// The genre slugs for a RAWG game (used to find similar games on the free tier,
// since RAWG's /suggested endpoint is paid-only).
export async function getGameGenres(id: string): Promise<string[]> {
  try {
    const key = getRAWGKey()
    const response = await fetch(`${RAWG_BASE_URL}/games/${id}?key=${key}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return []
    const data = await response.json()
    return (data.genres ?? []).map((g: any) => g.slug as string)
  } catch (error) {
    console.error('RAWG Genre Fetch Failure:', error)
    return []
  }
}

// Top-rated games for a set of genre slugs (free-tier game recommendations).
export async function getGamesByGenres(genreSlugs: string[]): Promise<GameSearchResult[]> {
  try {
    if (genreSlugs.length === 0) return []
    const key = getRAWGKey()
    const response = await fetch(
      `${RAWG_BASE_URL}/games?key=${key}&genres=${genreSlugs.join(',')}&ordering=-rating&page_size=20&metacritic=70,100`,
      { headers: { accept: 'application/json' }, cache: 'no-store' }
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
    console.error('RAWG Genre Discovery Failure:', error)
    return []
  }
}

// ─── Trending & Upcoming ─────────────────────────────────────────────────────

const mapRawgGame = (r: any): GameSearchResult => ({
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
})

const ymd = (d: Date) => d.toISOString().split('T')[0]

export async function getTrendingMedia(): Promise<MediaSearchResult[]> {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/trending/all/week?language=en-US`, {
      headers: getTMDBHeaders(), cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? [])
      .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
      .map((r: any) => ({
        id: r.id.toString(),
        title: r.title || r.name,
        overview: r.overview ?? '',
        posterPath: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
        releaseDate: r.release_date || r.first_air_date || '',
        mediaType: r.media_type as 'movie' | 'tv',
        voteAverage: r.vote_average ?? 0,
      }))
  } catch (error) {
    console.error('TMDB Trending Failure:', error)
    return []
  }
}

export async function getTrendingGames(): Promise<GameSearchResult[]> {
  try {
    const key = getRAWGKey()
    const today = new Date()
    const past = new Date(); past.setMonth(past.getMonth() - 2)
    const res = await fetch(
      `${RAWG_BASE_URL}/games?key=${key}&dates=${ymd(past)},${ymd(today)}&ordering=-added&page_size=12`,
      { headers: { accept: 'application/json' }, cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).map(mapRawgGame)
  } catch (error) {
    console.error('RAWG Trending Failure:', error)
    return []
  }
}

export async function getUpcomingMedia(): Promise<MediaSearchResult[]> {
  try {
    const [mv, tv] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/movie/upcoming?language=en-US&page=1`, { headers: getTMDBHeaders(), cache: 'no-store' }).then(r => r.ok ? r.json() : { results: [] }),
      fetch(`${TMDB_BASE_URL}/tv/on_the_air?language=en-US&page=1`, { headers: getTMDBHeaders(), cache: 'no-store' }).then(r => r.ok ? r.json() : { results: [] }),
    ])
    const movies = (mv.results ?? []).map((r: any) => ({
      id: r.id.toString(),
      title: r.title,
      overview: r.overview ?? '',
      posterPath: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      releaseDate: r.release_date || '',
      mediaType: 'movie' as const,
      voteAverage: r.vote_average ?? 0,
    }))
    const shows = (tv.results ?? []).map((r: any) => ({
      id: r.id.toString(),
      title: r.name,
      overview: r.overview ?? '',
      posterPath: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      releaseDate: r.first_air_date || '',
      mediaType: 'tv' as const,
      voteAverage: r.vote_average ?? 0,
    }))
    return [...movies, ...shows]
  } catch (error) {
    console.error('TMDB Upcoming Failure:', error)
    return []
  }
}

export async function getUpcomingGames(): Promise<GameSearchResult[]> {
  try {
    const key = getRAWGKey()
    const today = new Date()
    const future = new Date(); future.setMonth(future.getMonth() + 6)
    const res = await fetch(
      `${RAWG_BASE_URL}/games?key=${key}&dates=${ymd(today)},${ymd(future)}&ordering=-added&page_size=12`,
      { headers: { accept: 'application/json' }, cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).map(mapRawgGame)
  } catch (error) {
    console.error('RAWG Upcoming Failure:', error)
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

export interface PersonSearchResult {
  id: string
  name: string
  knownFor: string   // e.g. "Director · Inception, The Dark Knight"
  profilePath: string | null
}

export interface StudioSearchResult {
  id: string
  name: string
  gamesCount: number
  profilePath: string | null
}

export async function searchPersons(query: string): Promise<PersonSearchResult[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/person?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
      { headers: getTMDBHeaders(), cache: 'no-store' }
    )
    if (!response.ok) return []
    const data = await response.json()
    return (data.results || []).slice(0, 8).map((p: any) => {
      const knownTitles = (p.known_for || [])
        .slice(0, 2)
        .map((k: any) => k.title || k.name)
        .join(', ')
      return {
        id: p.id.toString(),
        name: p.name,
        knownFor: [p.known_for_department, knownTitles].filter(Boolean).join(' · '),
        profilePath: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null,
      }
    })
  } catch (error) {
    console.error('TMDB Person Search Failure:', error)
    return []
  }
}

export async function searchStudios(query: string): Promise<StudioSearchResult[]> {
  try {
    const key = getRAWGKey()
    const response = await fetch(
      `${RAWG_BASE_URL}/developers?key=${key}&search=${encodeURIComponent(query)}&page_size=8`,
      { headers: { accept: 'application/json' }, cache: 'no-store' }
    )
    if (!response.ok) return []
    const data = await response.json()
    return (data.results || []).map((d: any) => ({
      id: d.id.toString(),
      name: d.name,
      gamesCount: d.games_count ?? 0,
      profilePath: d.image_background ?? null,
    }))
  } catch (error) {
    console.error('RAWG Studio Search Failure:', error)
    return []
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
