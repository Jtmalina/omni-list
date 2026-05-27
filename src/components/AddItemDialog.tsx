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
import { MediaSearchResult } from '@/lib/media-api'
import Image from 'next/image'
import { X } from 'lucide-react'
import { fetchStreamingInfoAction } from '@/actions/media'
import { format } from 'date-fns'

export default function AddItemDialog({ listId, initialDate, onOpenChange }: { listId: string, initialDate?: Date, onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(!!initialDate)
  const [loading, setLoading] = useState(false)
  
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [type, setType] = useState<ItemType>(ItemType.TASK)
  const [mediaType, setMediaType] = useState<MediaType | undefined>(undefined)
  const [dueDate, setDueDate] = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : '')

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (onOpenChange) onOpenChange(newOpen)
    if (!newOpen) {
      // Small delay to allow transition to finish before resetting
      setTimeout(resetForm, 300)
    }
  }

  // Media specific state
  const [selectedMedia, setSelectedMedia] = useState<MediaSearchResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    setLoading(true)
    
    let streamingInfo = null
    if (selectedMedia) {
      streamingInfo = await fetchStreamingInfoAction(selectedMedia.id, selectedMedia.mediaType)
    }

    await createItem({
      title,
      notes: notes || undefined,
      listId,
      type,
      mediaType: type === ItemType.MEDIA ? mediaType : undefined,
      dueDate: dueDate ? new Date(dueDate + 'T00:00:00') : undefined,
      mediaMetadata: selectedMedia ? {
        posterPath: selectedMedia.posterPath || undefined,
        rating: selectedMedia.voteAverage,
        externalId: selectedMedia.id,
        streamingInfo: streamingInfo ?? undefined,
      } : undefined
    })
    setLoading(false)
    handleOpenChange(false)
  }

  const resetForm = () => {
    setTitle('')
    setNotes('')
    setType(ItemType.TASK)
    setMediaType(undefined)
    setDueDate('')
    setSelectedMedia(null)
  }

  const handleMediaSelect = (result: MediaSearchResult) => {
    setSelectedMedia(result)
    setTitle(result.title)
    setNotes(result.overview)
    setMediaType(result.mediaType === 'movie' ? MediaType.MOVIE : MediaType.SHOW)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Add Item</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => {
                setType(v as ItemType)
                if (v === ItemType.TASK) setSelectedMedia(null)
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ItemType.TASK}>Task</SelectItem>
                  <SelectItem value={ItemType.MEDIA}>Media</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === ItemType.MEDIA && !selectedMedia && (
              <div className="space-y-2">
                <Label>Search Media</Label>
                <MediaSearch onSelect={handleMediaSelect} />
              </div>
            )}

            {selectedMedia && (
              <div className="flex gap-4 p-3 bg-muted rounded-lg relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background shadow-sm"
                  onClick={() => setSelectedMedia(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="relative h-20 w-14 flex-shrink-0 rounded overflow-hidden">
                  {selectedMedia.posterPath && (
                    <Image
                      src={selectedMedia.posterPath}
                      alt={selectedMedia.title}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{selectedMedia.title}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {selectedMedia.mediaType} • {new Date(selectedMedia.releaseDate).getFullYear()}
                  </div>
                  <div className="text-xs font-bold mt-1">★ {selectedMedia.voteAverage.toFixed(1)}</div>
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
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
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
