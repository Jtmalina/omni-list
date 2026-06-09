'use client'

import Link from 'next/link'
import { LayoutList, ExternalLink, LogOut } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from './ui/button'
import ServarrSettingsDialog from './ServarrSettingsDialog'
import FriendsDialog from './FriendsDialog'
import ActivityFeed from './ActivityFeed'
import AutomationSettingsDialog from './AutomationSettingsDialog'

export default function Navbar() {
  const { data: session } = useSession()
  const homeHref = session?.user ? '/dashboard' : '/'

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-8 flex h-16 items-center justify-between">
        <Link href={homeHref} className="flex items-center gap-2 font-bold text-xl">
          <LayoutList className="h-6 w-6 text-primary" />
          <span>OmniList</span>
        </Link>
        <div className="flex items-center gap-4">
          {session?.user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                {session.user.email}
              </span>
              <ActivityFeed />
              <FriendsDialog />
              <AutomationSettingsDialog />
              <ServarrSettingsDialog />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="h-5 w-5" />
              </Button>
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
