'use client'

import { useState } from 'react'
import { createItem } from '@/actions/item'
import { ItemType, MediaType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import MediaSearch from './MediaSearch'
import GameSearch from './GameSearch'
import type { MediaSearchResult, GameSearchResult } from '@/lib/media-api'
import Image from 'next/image'
import { X, Gamepad2, Loader2, Plus } from 'lucide-react'
import { fetchStreamingInfoAction, fetchGameDetailsAction } from '@/actions/media'
import { format } from 'date-fns'
import { TagManager } from './TagManager'
import { cn } from '@/lib/utils'

type ItemMode = 'task' | 'film' | 'game'

export default function AddItemDialog({
  listId,
  initialDate,
  onOpenChange,
  buttonVariant = 'default',
  buttonSize = 'default',
  tagConfigs = {},
  allExistingTags = [],
}: {
  listId: string
  initialDate?: Date
  onOpenChange?: (open: boolean) => void
  buttonVariant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link'
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon'
  tagConfigs?: Record<string, string>
  allExistingTags?: string[]
}) {
  const [open, setOpen] = useState(!!initialDate)
  const [loading, setLoading] = useState(false)

  const [itemMode, setItemMode] = useState<ItemMode>('task')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : '')
  const [dueTime, setDueTime] = useState('')
  const [color, setColor] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [selectedMedia, setSelectedMedia] = useState<MediaSearchResult | null>(null)
  const [selectedGame, setSelectedGame] = useState<GameSearchResult | null>(null)
  const [fetchingDetails, setFetchingDetails] = useState(false)

  const PRESET_COLORS = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
  ]

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (onOpenChange) onOpenChange(newOpen)
    if (!newOpen) setTimeout(resetForm, 300)
  }

  const handleModeChange = (mode: ItemMode) => {
    setItemMode(mode)
    setSelectedMedia(null)
    setSelectedGame(null)
    setFetchingDetails(false)
    setTitle('')
    setNotes('')
  }

  const handleMediaSelect = (result: MediaSearchResult) => {
    setSelectedMedia(result)
    setTitle(result.title)
    setNotes(result.overview)
  }

  const handleGameSelect = async (result: GameSearchResult) => {
    setSelectedGame(result)
    setTitle(result.title)
    setNotes(result.overview) // genres as placeholder while details load
    setFetchingDetails(true)
    const details = await fetchGameDetailsAction(result.id)
    setFetchingDetails(false)
    if (details?.description) setNotes(details.description)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    setLoading(true)

    const effectiveType = itemMode === 'task' ? ItemType.TASK : ItemType.MEDIA
    const effectiveMediaType =
      itemMode === 'game' ? MediaType.GAME :
      selectedMedia?.mediaType === 'movie' ? MediaType.MOVIE :
      selectedMedia?.mediaType === 'tv' ? MediaType.SHOW :
      undefined

    let mediaMetadata: Parameters<typeof createItem>[0]['mediaMetadata'] = undefined

    if (selectedMedia) {
      const streamingInfo = await fetchStreamingInfoAction(selectedMedia.id, selectedMedia.mediaType)
      mediaMetadata = {
        posterPath: selectedMedia.posterPath ?? undefined,
        rating: selectedMedia.voteAverage,
        externalId: selectedMedia.id,
        streamingInfo: streamingInfo ?? undefined,
      }
    } else if (selectedGame) {
      mediaMetadata = {
        posterPath: selectedGame.posterPath ?? undefined,
        rating: selectedGame.rating,
        externalId: selectedGame.id,
        streamingInfo: {
          ...(selectedGame.metacritic != null && { metacritic: selectedGame.metacritic }),
          ...(selectedGame.esrb && { esrb: selectedGame.esrb }),
          ...(selectedGame.platforms.length > 0 && { platforms: selectedGame.platforms }),
          ...(selectedGame.stores.length > 0 && { stores: selectedGame.stores }),
        },
      }
    }

    await createItem({
      title,
      notes: notes || undefined,
      listId,
      type: effectiveType,
      mediaType: effectiveMediaType,
      dueDate: dueDate ? new Date(`${dueDate}T${dueTime || '00:00'}:00`) : undefined,
      color: color || undefined,
      tags,
      mediaMetadata,
    })

    setLoading(false)
    handleOpenChange(false)
  }

  const resetForm = () => {
    setItemMode('task')
    setTitle('')
    setNotes('')
    setDueDate('')
    setDueTime('')
    setColor('')
    setTags([])
    setSelectedMedia(null)
    setSelectedGame(null)
    setFetchingDetails(false)
  }

  const selectedPreview = selectedMedia
    ? {
        posterPath: selectedMedia.posterPath,
        title: selectedMedia.title,
        subtitle: `${selectedMedia.mediaType} • ${new Date(selectedMedia.releaseDate).getFullYear()}`,
        score: `★ ${selectedMedia.voteAverage.toFixed(1)}`,
        extra: null,
        icon: null,
      }
    : selectedGame
    ? {
        posterPath: selectedGame.posterPath,
        title: selectedGame.title,
        subtitle: `Game • ${selectedGame.releaseDate ? new Date(selectedGame.releaseDate).getFullYear() : '—'}`,
        score: selectedGame.metacritic ? `MC ${selectedGame.metacritic}` : `★ ${selectedGame.rating.toFixed(1)}`,
        extra: [
          selectedGame.esrb,
          selectedGame.platforms.slice(0, 3).join(' · '),
        ].filter(Boolean).join(' | '),
        icon: <Gamepad2 className="h-5 w-5 opacity-30" />,
      }
    : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} title="Add New Item">
          {buttonSize === 'icon' ? <Plus className="h-5 w-5" /> : 'Add Item'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={itemMode} onValueChange={(v) => handleModeChange(v as ItemMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="film">Movie / TV</SelectItem>
                  <SelectItem value="game">Game</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {itemMode === 'film' && !selectedMedia && (
              <div className="space-y-2">
                <Label>Search Movie / TV</Label>
                <MediaSearch onSelect={handleMediaSelect} />
              </div>
            )}

            {itemMode === 'game' && !selectedGame && (
              <div className="space-y-2">
                <Label>Search Game</Label>
                <GameSearch onSelect={handleGameSelect} />
              </div>
            )}

            {selectedPreview && (
              <div className="flex gap-4 p-3 bg-muted rounded-lg relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background shadow-sm"
                  onClick={() => {
                    setSelectedMedia(null)
                    setSelectedGame(null)
                    setTitle('')
                    setNotes('')
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="relative h-20 w-14 flex-shrink-0 rounded overflow-hidden bg-muted">
                  {selectedPreview.posterPath ? (
                    <Image
                      src={selectedPreview.posterPath}
                      alt={selectedPreview.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      {selectedPreview.icon}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{selectedPreview.title}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {selectedPreview.subtitle}
                  </div>
                  <div className="text-xs font-bold mt-1">{selectedPreview.score}</div>
                  {selectedPreview.extra && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {selectedPreview.extra}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                Notes (Optional)
                {fetchingDetails && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueTime">Time (Optional)</Label>
                <Input
                  id="dueTime"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Individual Color Override</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setColor('')}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center bg-background",
                    color === '' ? "border-primary ring-2 ring-primary/20 ring-offset-1" : "border-transparent"
                  )}
                  title="No override"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
                      color === c.value ? "border-primary ring-2 ring-primary/20 ring-offset-1" : "border-transparent"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <TagManager 
              listId={listId} 
              tags={tags} 
              onChange={setTags} 
              tagConfigs={tagConfigs}
              allExistingTags={allExistingTags}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add to List'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
