import { auth } from '@/lib/auth'

// Admins are configured via the ADMIN_EMAILS env var (comma-separated).
// If unset, nobody is an admin — the dashboard simply 404s.
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  const email = session?.user?.email?.toLowerCase()
  if (!email) return false
  return getAdminEmails().includes(email)
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error('Forbidden')
}
