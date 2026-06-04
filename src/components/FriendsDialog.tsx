'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  sendFriendRequestAction,
  getFriendsAction,
  getPendingRequestsAction,
  acceptFriendRequestAction,
  rejectFriendRequestAction
} from '@/actions/friends'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, UserPlus, UserCheck, UserX, Loader2, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function FriendsDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [friends, setFriends] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [f, p] = await Promise.all([
      getFriendsAction(),
      getPendingRequestsAction()
    ])
    setFriends(f)
    setPendingRequests(p)
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    startTransition(async () => {
      try {
        await sendFriendRequestAction(email)
        alert('Friend request sent!')
        setEmail('')
        fetchData()
      } catch (error: any) {
        alert(error.message)
      }
    })
  }

  const handleAccept = (requestId: string) => {
    startTransition(async () => {
      await acceptFriendRequestAction(requestId)
      fetchData()
    })
  }

  const handleReject = (requestId: string) => {
    if (confirm('Are you sure?')) {
      startTransition(async () => {
        await rejectFriendRequestAction(requestId)
        fetchData()
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Friends">
          <div className="relative">
            <Users className="h-5 w-5" />
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground font-bold">
                {pendingRequests.length}
              </span>
            )}
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Friends Management</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Send Request */}
          <form onSubmit={handleSendRequest} className="space-y-2">
            <Label htmlFor="email">Add Friend by Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </div>
          </form>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Pending Requests</Label>
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={req.sender.image} />
                        <AvatarFallback>{req.sender.name?.[0] || req.sender.email?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{req.sender.name || req.sender.email}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleAccept(req.id)} disabled={isPending}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleReject(req.id)} disabled={isPending}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="space-y-3">
            <Label className="text-xs uppercase font-bold text-muted-foreground">My Friends</Label>
            {loading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : friends.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded-lg transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={friend.image} />
                      <AvatarFallback>{friend.name?.[0] || friend.email?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{friend.name || friend.email}</div>
                      {friend.name && <div className="text-[10px] text-muted-foreground truncate">{friend.email}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground italic">
                No friends yet. Add some!
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
