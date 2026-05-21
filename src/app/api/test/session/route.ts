import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import prisma from '@/lib/prisma'

/**
 * THIS IS A SECURITY SENSITIVE ROUTE.
 * It is only intended for use in E2E testing environments.
 */
export async function GET(req: NextRequest) {
  // Only allow this in non-production environments and when explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_TEST_AUTH !== 'true') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || 'user_123'
  const email = searchParams.get('email') || 'test@example.com'

  // Ensure the user exists in the DB so foreign keys work
  await prisma.user.upsert({
    where: { id: userId },
    update: { email },
    create: {
      id: userId,
      email,
      name: 'Test User',
    },
  })

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return new NextResponse('AUTH_SECRET not configured', { status: 500 })
  }

  // Generate a valid encrypted JWE token using Auth.js's own logic
  const token = await encode({
    token: {
      sub: userId,
      email: email,
      name: 'Test User',
    },
    secret: secret,
    salt: 'authjs.session-token', // NextAuth v5 default salt
    maxAge: 30 * 24 * 60 * 60, // 30 days
  })

  const response = NextResponse.json({ success: true })
  
  // Set the cookie exactly how Auth.js would
  response.cookies.set('authjs.session-token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // Localhost is typically http
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })

  return response
}
