import { NextResponse } from 'next/server'

export async function GET() {
  const raw = process.env.TMDB_API_KEY ?? ''
  const token = raw.trim().replace(/^["']|["']$/g, '')

  const tokenInfo = {
    present: raw.length > 0,
    rawLength: raw.length,
    cleanedLength: token.length,
    startsWithQuote: raw.startsWith('"') || raw.startsWith("'"),
    endsWithQuote: raw.endsWith('"') || raw.endsWith("'"),
    prefix: token.slice(0, 4),   // safe — just "eyJ0" for a JWT
    suffix: token.slice(-4),     // safe — last 4 chars
  }

  try {
    const res = await fetch(
      'https://api.themoviedb.org/3/search/multi?query=batman&include_adult=false&language=en-US&page=1',
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      }
    )
    const data = await res.json()
    return NextResponse.json({
      token: tokenInfo,
      httpStatus: res.status,
      resultCount: data.results?.length ?? 0,
      tmdbError: res.ok ? null : data,
    })
  } catch (e: unknown) {
    const err = e as Error & { cause?: { code?: string; message?: string } }
    return NextResponse.json({
      token: tokenInfo,
      error: err.message,
      causeCode: err.cause?.code ?? null,
    }, { status: 500 })
  }
}
