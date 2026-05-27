const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

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
