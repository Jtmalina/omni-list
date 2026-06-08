import { syncUpcomingReleasesAction } from '@/actions/follow'
import { NextResponse } from 'next/server'

/**
 * Vercel Cron Job Route
 * Triggered periodically to check for new releases for active users.
 * Security: Requires CRON_SECRET header.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  // Basic security check to prevent public abuse
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const result = await syncUpcomingReleasesAction()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Cron Sync Failed:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
