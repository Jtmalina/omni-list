import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { searchMedia } from './media-api'

const mockResults = {
  results: [
    {
      id: 123,
      title: 'Mock Movie',
      overview: 'A test overview',
      poster_path: '/path.jpg',
      release_date: '2024-01-01',
      media_type: 'movie',
      vote_average: 8.5,
    },
  ],
}

const server = setupServer(
  http.get('https://api.themoviedb.org/3/search/multi', () => {
    return HttpResponse.json(mockResults)
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('media-api', () => {
  it('correctly parses search results from TMDB', async () => {
    // Temporarily set the API key for the test
    process.env.TMDB_API_KEY = 'test-key'
    
    const results = await searchMedia('mock')
    
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Mock Movie')
    expect(results[0].posterPath).toContain('image.tmdb.org/t/p/w500/path.jpg')
    expect(results[0].voteAverage).toBe(8.5)
  })

  it('handles missing poster paths gracefully', async () => {
    server.use(
      http.get('https://api.themoviedb.org/3/search/multi', () => {
        return HttpResponse.json({
          results: [{ id: 456, name: 'Mock TV', media_type: 'tv', poster_path: null }]
        })
      })
    )

    const results = await searchMedia('mock')
    expect(results[0].posterPath).toBeNull()
  })
})
