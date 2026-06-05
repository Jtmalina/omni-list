'use client'

import { useState, useTransition } from 'react'
import { Item, ItemStatus, MediaType, MediaMetadata } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { updateItemStatus, deleteItem, updateItem } from '@/actions/item'
import { Star, Film, Tv, Gamepad2, Trash2, Save, Loader2, Edit2, Tag, X } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import ItemActions from './ItemActions'
import { TagBadge } from './TagBadge'
import { TagManager } from './TagManager'

type ItemWithMedia = Item & {
  media?: MediaMetadata | null
}

interface ItemDetailsDialogProps {
  item: ItemWithMedia | null
  listId: string
  isOpen: boolean
  onClose: () => void
  isRadarrEnabled?: boolean
  isSonarrEnabled?: boolean
  canEdit?: boolean
  isOwner?: boolean
  tagConfigs?: Record<string, string>
  allExistingTags?: string[]
}

export default function ItemDetailsDialog({
  item,
  listId,
  isOpen,
  onClose,
  isRadarrEnabled,
  isSonarrEnabled,
  canEdit = true,
  isOwner = false,
  tagConfigs = {},
  allExistingTags = [],
}: ItemDetailsDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  
  // Edit states
  const [editTitle, setEditTitle] = useState(item?.title || '')
  const [editNotes, setEditNotes] = useState(item?.notes || '')
  const [editColor, setEditColor] = useState(item?.color || '')
  const [editTags, setEditTags] = useState<string[]>(item?.tags || [])

  // Sync edit state when item changes
  useState(() => {
    if (item) {
      setEditTitle(item.title)
      setEditNotes(item.notes || '')
      setEditColor(item.color || '')
      setEditTags(item.tags || [])
    }
  })

  if (!item) return null

  const isMedia = item.type === 'MEDIA'
  const isGame = item.mediaType === 'GAME'

  const PRESET_COLORS = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
  ]

  const handleDelete = () => {
    if (!canEdit) return
    if (confirm('Are you sure you want to delete this item?')) {
      startTransition(async () => {
        await deleteItem(item.id, listId)
        onClose()
      })
    }
  }

  const handleUpdate = () => {
    startTransition(async () => {
      await updateItem(item.id, {
        title: editTitle,
        notes: editNotes,
        color: editColor || null,
        tags: editTags,
        listId
      })
      setIsEditing(false)
    })
  }

  const toggleStatus = () => {
    if (!canEdit) return
    const nextStatus = item.status === ItemStatus.COMPLETED ? ItemStatus.TODO : ItemStatus.COMPLETED
    startTransition(async () => {
      await updateItemStatus(item.id, nextStatus, listId)
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex justify-between items-start pr-8">
            <div className="space-y-1 flex-1">
              {isEditing ? (
                <Input 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-2xl font-bold h-auto py-1"
                />
              ) : (
                <DialogTitle className="text-2xl font-bold">{item.title}</DialogTitle>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] uppercase">
                  {item.mediaType || item.type}
                </Badge>
                {item.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    Due: {new Date(item.dueDate).toLocaleDateString()}
                  </span>
                )}
                {!isEditing && item.tags.map(tag => (
                  <TagBadge key={tag} name={tag} color={tagConfigs[tag]} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <ItemActions 
                id={item.id} 
                status={item.status} 
                listId={listId} 
                mediaType={item.mediaType}
                isRadarrEnabled={isRadarrEnabled}
                isSonarrEnabled={isSonarrEnabled}
                canEdit={canEdit}
                isOwner={isOwner}
              />
              {canEdit && !isEditing && (
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-3 w-3" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Notes</Label>
                <Textarea 
                  value={editNotes} 
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add details..."
                  className="min-h-[100px] text-sm"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Individual Color Override</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditColor('')}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all flex items-center justify-center bg-background",
                      editColor === '' ? "border-primary ring-2 ring-primary/20 ring-offset-1" : "border-transparent"
                    )}
                    title="No override"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setEditColor(c.value)}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-all",
                        editColor === c.value ? "border-primary ring-2 ring-primary/20 ring-offset-1" : "border-transparent"
                      )}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <TagManager 
                listId={listId} 
                tags={editTags} 
                onChange={setEditTags} 
                tagConfigs={tagConfigs}
                allExistingTags={allExistingTags}
              />
            </div>
          ) : (
            <>
              {isMedia && item.media && (
                <div className="flex gap-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="relative h-32 w-20 flex-shrink-0 rounded overflow-hidden shadow-md">
                    {item.media.posterPath ? (
                      <Image
                        src={item.media.posterPath}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-muted">
                        {item.mediaType === 'MOVIE' ? <Film className="h-8 w-8 opacity-20" /> :
                         item.mediaType === 'GAME' ? <Gamepad2 className="h-8 w-8 opacity-20" /> :
                         <Tv className="h-8 w-8 opacity-20" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    {item.media.rating && (
                      <div className="flex items-center gap-1 text-yellow-600 font-bold">
                        <Star className="h-4 w-4 fill-current" />
                        {item.media.rating.toFixed(1)}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-4 italic">
                      {item.notes || "No description provided."}
                    </p>
                  </div>
                </div>
              )}

              {!isMedia && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Notes</Label>
                  <div className="p-4 bg-muted/30 rounded-lg min-h-[100px] text-sm whitespace-pre-wrap border italic">
                    {item.notes || "No notes added."}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-muted-foreground">Status:</span>
              <Badge 
                className={cn(
                  "transition-colors",
                  canEdit ? "cursor-pointer" : "cursor-default",
                  item.status === 'COMPLETED' ? "bg-green-500 hover:bg-green-600" : "bg-secondary hover:bg-secondary/80"
                )}
                onClick={canEdit ? toggleStatus : undefined}
              >
                {item.status}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className={cn("sm:justify-between gap-2", (!canEdit || isEditing) && "sm:justify-end")}>
          {isEditing ? (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpdate} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Save Changes
              </Button>
            </div>
          ) : (
            <>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Item
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
