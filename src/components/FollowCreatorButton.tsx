'use client'

import { useState, useTransition } from 'react'
import { toggleFollowAction } from '@/actions/follow'
import { FollowType, MediaType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface FollowCreatorButtonProps {
  externalId: string
  name: string
  type: 'PERSON' | 'STUDIO'
  mediaType: MediaType
  knownFor?: string | null
  posterPath?: string | null
  initialIsFollowing: boolean
  /** When true, renders a pill-shaped button with "Follow / Following" text instead of just an icon */
  showLabel?: boolean
}

export default function FollowCreatorButton({
  externalId,
  name,
  type,
  mediaType,
  knownFor,
  posterPath,
  initialIsFollowing,
  showLabel = false,
}: FollowCreatorButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      const result = await toggleFollowAction({
        externalId,
        type: type === 'PERSON' ? FollowType.PERSON : FollowType.STUDIO,
        mediaType,
        name,
        knownFor,
        posterPath,
      })
      if (result.success) {
        setIsFollowing(result.isFollowing)
        toast.success(result.isFollowing ? `Following ${name}` : `Unfollowed ${name}`)
      }
    })
  }

  if (showLabel) {
    return (
      <Button
        variant={isFollowing ? 'secondary' : 'outline'}
        size="sm"
        className={cn(
          'rounded-full font-bold text-[11px] uppercase tracking-wider gap-1.5 shrink-0 transition-all',
          isFollowing
            ? 'text-primary border-primary/30 bg-primary/10 hover:bg-primary/20'
            : 'text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5'
        )}
        onClick={handleClick}
        disabled={isPending}
        title={isFollowing ? `Unfollow ${name}` : `Follow ${name} for new releases`}
      >
        {isFollowing ? (
          <UserCheck className="h-3.5 w-3.5" />
        ) : (
          <UserPlus className="h-3.5 w-3.5" />
        )}
        {isFollowing ? 'Following' : 'Follow'}
      </Button>
    )
  }

  return (
    <Button
      variant={isFollowing ? 'secondary' : 'ghost'}
      size="icon"
      className={cn(
        'h-8 w-8 rounded-full shrink-0 transition-all',
        isFollowing
          ? 'text-primary bg-primary/10 hover:bg-primary/20'
          : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
      )}
      onClick={handleClick}
      disabled={isPending}
      title={isFollowing ? `Unfollow ${name}` : `Follow ${name} for new releases`}
    >
      {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
    </Button>
  )
}
