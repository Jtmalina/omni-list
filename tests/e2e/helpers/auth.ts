import { Page } from '@playwright/test'

/**
 * Hits the test session endpoint to set a valid Auth.js session cookie.
 */
export async function login(page: Page, userId: string = 'user_123', email: string = 'test@example.com') {
  // We hit the internal endpoint which will set the cookie in the browser
  await page.goto(`/api/test/session?userId=${userId}&email=${email}`)
  
  // Verify the cookie was set
  const cookies = await page.context().cookies()
  const sessionCookie = cookies.find(c => c.name === 'authjs.session-token')
  
  if (!sessionCookie) {
    throw new Error('Failed to set session cookie via test endpoint')
  }
}
