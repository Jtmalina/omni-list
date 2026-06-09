'use client'

import { useState, useEffect, useTransition, useRef, useCallback } from 'react'
import { getUserSettingsAction, updateUserAutomationSettingsAction, syncNowAction } from '@/actions/user'
import { getLists } from '@/actions/list'
import {
  getFollowsAction,
  toggleFollowAction,
  searchPersonsAction,
  searchStudiosAction,
} from '@/actions/follow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Sparkles,
  Loader2,
  Save,
  RefreshCw,
  X,
  Building2,
  User,
  Search,
  UserPlus,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { MediaType } from '@prisma/client'

type Tab = 'following' | 'discover'

export default function AutomationSettingsDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<Tab>('following')

  const [lists, setLists] = useState<{ id: string; title: string }[]>([])
  const [follows, setFollows] = useState<any[]>([])
  const [autoAddListId, setAutoAddListId] = useState<string>('')

  // Discover tab state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'person' | 'studio'>('person')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setFetching(true)
      Promise.all([
        getUserSettingsAction(),
        getLists(),
        getFollowsAction(),
      ]).then(([settings, userLists, userFollows]) => {
        setLists(userLists)
        setFollows(userFollows)
        setAutoAddListId(settings?.autoAddListId ?? 'none')
        setFetching(false)
      })
    } else {
      // Reset discover state on close
      setSearchQuery('')
      setSearchResults([])
      setActiveTab('following')
    }
  }, [open])

  // Debounced search
  const runSearch = useCallback(
    (query: string, type: 'person' | 'studio') => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (!query.trim()) {
        setSearchResults([])
        return
      }
      debounceRef.current = setTimeout(async () => {
        setSearching(true)
        try {
          const results =
            type === 'person'
              ? await searchPersonsAction(query)
              : await searchStudiosAction(query)
          setSearchResults(results)
        } finally {
          setSearching(false)
        }
      }, 350)
    },
    []
  )

  useEffect(() => {
    runSearch(searchQuery, searchType)
  }, [searchQuery, searchType, runSearch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateUserAutomationSettingsAction({
        autoAddListId: autoAddListId === 'none' ? null : autoAddListId,
      })
      toast.success('Automation settings saved')
      setOpen(false)
    } catch {
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
    } catch {
      toast.error('Failed to run sync')
    } finally {
      setSyncing(false)
    }
  }

  const handleUnfollow = (follow: any) => {
    startTransition(async () => {
      const result = await toggleFollowAction({
        externalId: follow.externalId,
        type: follow.type,
        mediaType: follow.mediaType,
        name: follow.name,
      })
      if (result.success) {
        setFollows((prev) => prev.filter((f) => f.id !== follow.id))
        toast.success(`Stopped following ${follow.name}`)
      }
    })
  }

  // Follow/unfollow from discover results
  const handleDiscoverToggle = (result: any) => {
    const isPersonResult = searchType === 'person'
    const existingFollow = follows.find((f) => f.externalId === result.id)

    startTransition(async () => {
      const payload = {
        externalId: result.id,
        type: isPersonResult ? ('PERSON' as const) : ('STUDIO' as const),
        mediaType: isPersonResult ? MediaType.MOVIE : MediaType.GAME,
        name: result.name,
        posterPath: result.profilePath ?? null,
      }
      const followResult = await toggleFollowAction(payload)
      if (followResult.success) {
        if (followResult.isFollowing) {
          // Add to local follows list
          setFollows((prev) => [
            ...prev,
            {
              id: `temp-${result.id}`,
              externalId: result.id,
              type: payload.type,
              mediaType: payload.mediaType,
              name: result.name,
              posterPath: result.profilePath ?? null,
            },
          ])
          toast.success(`Following ${result.name}`)
        } else {
          setFollows((prev) => prev.filter((f) => f.externalId !== result.id))
          toast.success(`Unfollowed ${result.name}`)
        }
      }
    })
  }

  const followedIds = new Set(follows.map((f) => f.externalId))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Automation Settings">
          <Sparkles className="h-5 w-5 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col p-0">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-6 pb-4">
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
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 scrollbar-hide">
              {/* Landing List Config */}
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

              {/* Manual Sync */}
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
                    {syncing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Check for releases
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  We check once a week for active users. Use this to trigger an immediate scan.
                </p>
              </div>

              {/* Following / Discover tabs */}
              <div className="space-y-4 pt-2 border-t">
                {/* Tab bar */}
                <div className="flex gap-1 p-1 bg-muted/40 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('following')}
                    className={cn(
                      'flex-1 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all',
                      activeTab === 'following'
                        ? 'bg-background shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Following ({follows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className={cn(
                      'flex-1 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all',
                      activeTab === 'discover'
                        ? 'bg-background shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Find Creators
                  </button>
                </div>

                {/* Following list */}
                {activeTab === 'following' && (
                  <div className="space-y-2">
                    {follows.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <p className="text-xs text-muted-foreground italic">
                          You aren&apos;t following anyone yet.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('discover')}
                          className="text-xs text-primary font-bold hover:underline"
                        >
                          Search for creators to follow →
                        </button>
                      </div>
                    ) : (
                      follows.map((follow) => (
                        <div
                          key={follow.id}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded-xl group hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted border shrink-0">
                              {follow.posterPath ? (
                                <Image
                                  src={follow.posterPath}
                                  alt={follow.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  {follow.type === 'STUDIO' ? (
                                    <Building2 className="h-3 w-3 opacity-20" />
                                  ) : (
                                    <User className="h-3 w-3 opacity-20" />
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{follow.name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">
                                {follow.type === 'STUDIO' ? 'Game Studio' : 'Person'}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleUnfollow(follow)}
                            disabled={isPending}
                            title={`Unfollow ${follow.name}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Discover / Search */}
                {activeTab === 'discover' && (
                  <div className="space-y-4">
                    {/* Type toggle */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setSearchType('person'); setSearchResults([]) }}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                          searchType === 'person'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted'
                        )}
                      >
                        <User className="h-3 w-3" />
                        People
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSearchType('studio'); setSearchResults([]) }}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                          searchType === 'studio'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted'
                        )}
                      >
                        <Building2 className="h-3 w-3" />
                        Game Studios
                      </button>
                    </div>

                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder={
                          searchType === 'person'
                            ? 'Search directors, actors...'
                            : 'Search game studios...'
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {/* Results */}
                    <div className="space-y-2 min-h-[80px]">
                      {!searchQuery.trim() && (
                        <p className="text-xs text-muted-foreground italic text-center py-6">
                          {searchType === 'person'
                            ? 'Search for a director or actor to follow their upcoming releases.'
                            : 'Search for a game studio to follow their upcoming releases.'}
                        </p>
                      )}
                      {searchQuery.trim() && !searching && searchResults.length === 0 && (
                        <p className="text-xs text-muted-foreground italic text-center py-6">
                          No results found for &ldquo;{searchQuery}&rdquo;
                        </p>
                      )}
                      {searchResults.map((result) => {
                        const isFollowing = followedIds.has(result.id)
                        return (
                          <div
                            key={result.id}
                            className="flex items-center justify-between p-2 bg-muted/20 rounded-xl border border-transparent hover:border-muted-foreground/10 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted border shrink-0">
                                {result.profilePath ? (
                                  <Image
                                    src={result.profilePath}
                                    alt={result.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    {searchType === 'studio' ? (
                                      <Building2 className="h-4 w-4 opacity-20" />
                                    ) : (
                                      <User className="h-4 w-4 opacity-20" />
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">{result.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {searchType === 'person'
                                    ? result.knownFor
                                    : `${result.gamesCount} games`}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant={isFollowing ? 'secondary' : 'ghost'}
                              size="icon"
                              className={cn(
                                'h-8 w-8 rounded-full shrink-0 transition-all',
                                isFollowing
                                  ? 'text-primary bg-primary/10 hover:bg-primary/20'
                                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                              )}
                              onClick={() => handleDiscoverToggle(result)}
                              disabled={isPending}
                              title={isFollowing ? `Unfollow ${result.name}` : `Follow ${result.name}`}
                            >
                              {isFollowing ? (
                                <UserCheck className="h-4 w-4" />
                              ) : (
                                <UserPlus className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="p-6 pt-0 gap-2">
            <Button
              type="submit"
              disabled={loading || fetching}
              className="w-full sm:w-auto font-bold"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Configuration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
