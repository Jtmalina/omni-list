import Link from 'next/link'
import { LayoutList, ExternalLink, LogOut } from 'lucide-react'
import { auth, signOut } from '@/lib/auth'
import { Button } from './ui/button'
import ServarrSettingsDialog from './ServarrSettingsDialog'

export default async function Navbar() {
  const session = await auth()

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-8 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <LayoutList className="h-6 w-6 text-primary" />
          <span>OmniList</span>
        </Link>
        <div className="flex items-center gap-4">
          {session?.user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                {session.user.email}
              </span>
              <ServarrSettingsDialog />
              <form
                action={async () => {
                  "use server"
                  await signOut()
                }}
              >
                <Button variant="ghost" size="icon" type="submit">
                  <LogOut className="h-5 w-5" />
                </Button>
              </form>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
          )}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        </div>
      </div>
    </nav>
  )
}
