import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not available in production', { status: 404 })
  }

  const token = process.env.TMDB_API_KEY?.trim()

  try {
    const res = await fetch(
      'https://api.themoviedb.org/3/search/multi?query=batman&include_adult=false&language=en-US&page=1',
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        cache: 'no-store',
      }
    )
    const data = await res.json()
    return NextResponse.json({
      tokenPresent: !!token,
      tokenLength: token?.length ?? 0,
      httpStatus: res.status,
      resultCount: data.results?.length ?? 0,
      firstResult: data.results?.[0]?.title ?? data.results?.[0]?.name ?? null,
    })
  } catch (e: unknown) {
    const err = e as Error & { cause?: { code?: string; message?: string } }
    return NextResponse.json({
      tokenPresent: !!token,
      tokenLength: token?.length ?? 0,
      error: err.message,
      causeCode: err.cause?.code ?? null,
      causeMessage: err.cause?.message ?? null,
    }, { status: 500 })
  }
}
