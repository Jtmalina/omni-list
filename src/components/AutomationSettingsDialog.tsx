'use client'

import { useState, useEffect, useTransition } from 'react'
import { getUserSettingsAction, updateUserAutomationSettingsAction, syncNowAction } from '@/actions/user'
import { getLists } from '@/actions/list'
import { getFollowsAction, toggleFollowAction } from '@/actions/follow'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Sparkles, Loader2, Save, RefreshCw, X, Building2, User } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export default function AutomationSettingsDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [lists, setLists] = useState<{ id: string; title: string }[]>([])
  const [follows, setFollows] = useState<any[]>([])
  const [autoAddListId, setAutoAddListId] = useState<string>('')

  useEffect(() => {
    if (open) {
      setFetching(true)
      Promise.all([
        getUserSettingsAction(),
        getLists(),
        getFollowsAction()
      ]).then(([settings, userLists, userFollows]) => {
        setLists(userLists)
        setFollows(userFollows)
        if (settings?.autoAddListId) {
          setAutoAddListId(settings.autoAddListId)
        } else {
          setAutoAddListId('none')
        }
        setFetching(false)
      })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await updateUserAutomationSettingsAction({
        autoAddListId: autoAddListId === 'none' ? null : autoAddListId
      })
      toast.success('Automation settings saved')
      setOpen(false)
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      const result = await syncNowAction()
      if (result.success) {
        toast.success(`Sync complete! Added ${result.addedCount} new items.`)
      }
    } catch (error) {
      toast.error('Failed to run sync')
    } finally {
      setSyncing(false)
    }
  }

  const handleUnfollow = async (follow: any) => {
    startTransition(async () => {
      const result = await toggleFollowAction({
        externalId: follow.externalId,
        type: follow.type,
        mediaType: follow.mediaType,
        name: follow.name
      })
      if (result.success) {
        setFollows(prev => prev.filter(f => f.id !== follow.id))
        toast.success(`Stopped following ${follow.name}`)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Automation Settings">
          <Sparkles className="h-5 w-5 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] flex flex-col p-0">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Smart Automation
            </DialogTitle>
            <DialogDescription>
              Automatically add upcoming releases from people and studios you follow.
            </DialogDescription>
          </DialogHeader>

          {fetching ? (
            <div className="flex-1 py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-mono">Loading settings...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Landing List</Label>
                  <Select value={autoAddListId} onValueChange={setAutoAddListId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a list" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Disabled (Do not auto-add)</SelectItem>
                      {lists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground italic">
                    New discoveries will be pinned to this list automatically with their release date.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-black uppercase tracking-tight">Manual Refresh</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-2 font-bold text-[10px] uppercase"
                    onClick={handleSyncNow}
                    disabled={syncing || !autoAddListId || autoAddListId === 'none'}
                  >
                    {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Check for releases
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Normally we check for new releases once a week if you're active. Use this to trigger an immediate scan across all your follows.
                </p>
              </div>

              {/* Following Management */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-xs font-black uppercase tracking-tight opacity-50">Manage Follows ({follows.length})</Label>
                <div className="space-y-2">
                  {follows.map((follow) => (
                    <div key={follow.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-xl group hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted border shrink-0">
                          {follow.posterPath ? (
                            <Image src={follow.posterPath} alt={follow.name} fill className="object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              {follow.type === 'STUDIO' ? <Building2 className="h-3 w-3 opacity-20" /> : <User className="h-3 w-3 opacity-20" />}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{follow.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{follow.type}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleUnfollow(follow)}
                        disabled={isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {follows.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-4">You aren't following anyone yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-6 pt-0 gap-2">
            <Button type="submit" disabled={loading || fetching} className="w-full sm:w-auto font-bold">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
