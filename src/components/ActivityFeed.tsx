'use client'

import { useState, useEffect } from 'react'
import { getActivitiesAction } from '@/actions/activity'
import { Activity, ActivityType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Bell, UserPlus, CheckCircle2, PlusCircle, Trash2, Share2, Sparkles, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ActivityWithDetails extends Activity {
  user: { id: string; name: string | null; image: string | null; email: string | null }
  list: { id: string; title: string } | null
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setLoading(true)
      getActivitiesAction().then((data) => {
        setActivities(data as ActivityWithDetails[])
        setLoading(false)
      })
    }
  }, [open])

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'ITEM_CREATED': return <PlusCircle className="h-4 w-4 text-blue-500" />
      case 'ITEM_COMPLETED': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'ITEM_DELETED': return <Trash2 className="h-4 w-4 text-red-500" />
      case 'LIST_SHARED': return <Share2 className="h-4 w-4 text-purple-500" />
      case 'FRIEND_ACCEPTED': return <UserPlus className="h-4 w-4 text-orange-500" />
      default: return <Sparkles className="h-4 w-4 text-primary" />
    }
  }

  const renderActivityText = (activity: ActivityWithDetails) => {
    const userName = <strong>{activity.user.name || activity.user.email}</strong>
    const itemTitle = activity.itemTitle ? <em>&ldquo;{activity.itemTitle}&rdquo;</em> : 'an item'
    const listTitle = activity.list ? <strong>{activity.list.title}</strong> : 'a list'

    switch (activity.type) {
      case 'ITEM_CREATED':
        return <>{userName} added {itemTitle} to {listTitle}</>
      case 'ITEM_COMPLETED':
        return <>{userName} completed {itemTitle} in {listTitle}</>
      case 'ITEM_DELETED':
        return <>{userName} deleted {itemTitle} from {listTitle}</>
      case 'LIST_SHARED':
        const friendName = (activity.metadata as any)?.friendName || 'a friend'
        return <>{userName} shared {listTitle} with <strong>{friendName}</strong></>
      case 'FRIEND_ACCEPTED':
        const connectedWith = (activity.metadata as any)?.friendName || 'a friend'
        return <>{userName} is now friends with <strong>{connectedWith}</strong></>
      default:
        return <>{userName} performed an action</>
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Activity Feed">
          <Bell className="h-5 w-5" />
          {activities.length > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-primary rounded-full ring-2 ring-background animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Social Activity
          </h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2 opacity-50">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-[10px] font-mono uppercase font-bold tracking-widest">Fetching updates...</p>
            </div>
          ) : activities.length > 0 ? (
            <div className="divide-y divide-muted/50">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 flex gap-3 hover:bg-muted/30 transition-colors">
                  <Avatar className="h-8 w-8 border shadow-sm">
                    <AvatarImage src={activity.user.image || undefined} />
                    <AvatarFallback className="text-[10px] font-black uppercase tracking-tighter">
                      {(activity.user.name || activity.user.email || 'U').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs leading-relaxed text-foreground">
                      {renderActivityText(activity)}
                    </p>
                    <div className="flex items-center gap-1.5 opacity-50">
                      {getActivityIcon(activity.type)}
                      <span className="text-[9px] font-bold uppercase tracking-tight">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center space-y-2 opacity-20">
              <Sparkles className="h-12 w-12 mx-auto" />
              <p className="text-xs font-black uppercase tracking-widest">No activity yet</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t bg-muted/20">
           <p className="text-[9px] text-center text-muted-foreground uppercase font-black tracking-widest py-1">Collaborative Timeline</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
