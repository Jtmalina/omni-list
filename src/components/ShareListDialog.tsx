'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  shareListAction,
  revokeAccessAction,
  getListCollaboratorsAction
} from '@/actions/share'
import { getFriendsAction } from '@/actions/friends'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Share2, Loader2, UserMinus, Eye, Edit3, Shield } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AccessLevel } from '@prisma/client'

export default function ShareListDialog({ listId, listTitle }: { listId: string, listTitle: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [friends, setFriends] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [f, c] = await Promise.all([
      getFriendsAction(),
      getListCollaboratorsAction(listId)
    ])
    setFriends(f)
    setCollaborators(c)
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, listId])

  const handleShare = (friendId: string, level: AccessLevel) => {
    startTransition(async () => {
      await shareListAction(listId, friendId, level)
      fetchData()
    })
  }

  const handleRevoke = (userId: string) => {
    if (confirm('Revoke access for this user?')) {
      startTransition(async () => {
        await revokeAccessAction(listId, userId)
        fetchData()
      })
    }
  }

  // Friends who are not yet collaborators
  const availableFriends = friends.filter(
    f => !collaborators.some(c => c.userId === f.id)
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Share List">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share "{listTitle}"</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Current Collaborators */}
          <div className="space-y-3">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Collaborators</Label>
            {loading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : collaborators.length > 0 ? (
              <div className="space-y-2">
                {collaborators.map((collab) => (
                  <div key={collab.userId} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={collab.user.image} />
                        <AvatarFallback>{collab.user.name?.[0] || collab.user.email?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{collab.user.name || collab.user.email}</div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                          {collab.accessLevel === 'EDIT' ? <Edit3 className="h-2 w-2" /> : <Eye className="h-2 w-2" />}
                          {collab.accessLevel}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Select
                        value={collab.accessLevel}
                        onValueChange={(val) => handleShare(collab.userId, val as AccessLevel)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-8 w-24 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIEW">View Only</SelectItem>
                          <SelectItem value="EDIT">Can Edit</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRevoke(collab.userId)}
                        disabled={isPending}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground italic">
                Not shared with anyone yet.
              </div>
            )}
          </div>

          {/* Add Friends */}
          <div className="space-y-3">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Add Friends</Label>
            {availableFriends.length > 0 ? (
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {availableFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg transition-colors group">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.image} />
                        <AvatarFallback>{friend.name?.[0] || friend.email?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{friend.name || friend.email}</div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleShare(friend.id, 'VIEW')} disabled={isPending}>
                        View
                      </Button>
                      <Button size="sm" className="h-7 text-[10px]" onClick={() => handleShare(friend.id, 'EDIT')} disabled={isPending}>
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground italic">
                {friends.length === 0 ? "Add friends first to share lists!" : "All your friends already have access."}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
