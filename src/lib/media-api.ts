const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_ACCESS_TOKEN = process.env.TMDB_API_KEY

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
  if (!TMDB_ACCESS_TOKEN || TMDB_ACCESS_TOKEN === 'your-tmdb-api-key-here') {
    console.warn('TMDB API Key is missing or default. Returning empty search results.')
    return []
  }

  const response = await fetch(
    `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch media from TMDB')
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
}

export async function getStreamingProviders(mediaId: string, mediaType: 'movie' | 'tv') {
  if (!TMDB_ACCESS_TOKEN || TMDB_ACCESS_TOKEN === 'your-tmdb-api-key-here') return null

  const response = await fetch(
    `${TMDB_BASE_URL}/${mediaType}/${mediaId}/watch/providers`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
      },
    }
  )

  if (!response.ok) return null

  const data = await response.json()
  // US providers as default
  return data.results?.US || null
}
