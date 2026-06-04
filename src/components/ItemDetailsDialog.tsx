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
import { updateItemStatus, deleteItem } from '@/actions/item'
import { Star, Film, Tv, Gamepad2, Trash2, Save, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import ItemActions from './ItemActions'

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
}: ItemDetailsDialogProps) {
  const [isPending, startTransition] = useTransition()
  
  if (!item) return null

  const isMedia = item.type === 'MEDIA'
  const isGame = item.mediaType === 'GAME'

  const handleDelete = () => {
    if (!canEdit) return
    if (confirm('Are you sure you want to delete this item?')) {
      startTransition(async () => {
        await deleteItem(item.id, listId)
        onClose()
      })
    }
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
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold">{item.title}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase">
                  {item.mediaType || item.type}
                </Badge>
                {item.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    Due: {new Date(item.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
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
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {isMedia && item.media && (
            <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
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
              <div className="p-4 bg-muted/30 rounded-lg min-h-[100px] text-sm whitespace-pre-wrap">
                {item.notes || "No notes added."}
              </div>
            </div>
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

        <DialogFooter className={cn("sm:justify-between gap-2", !canEdit && "sm:justify-end")}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
