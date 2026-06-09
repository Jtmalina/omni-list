'use client'

import { useState, useTransition, useEffect } from 'react'
import { Item, ItemStatus, MediaType, MediaMetadata, FollowType } from '@prisma/client'
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
import { toggleFollowAction, getFollowsAction } from '@/actions/follow'
import { getMediaCredits, getGameCreators, MediaCredit, GameCreator } from '@/lib/media-api'
import { Star, Film, Tv, Gamepad2, Trash2, Save, Loader2, Edit2, Tag, X, UserPlus, UserCheck, Building2, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import ItemActions from './ItemActions'
import { TagBadge } from './TagBadge'
import { TagManager } from './TagManager'
import { format } from 'date-fns'
import { toast } from 'sonner'

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
  onStatusToggle?: (item: Item) => void
  onItemDelete?: (id: string) => void
  startInEditMode?: boolean
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
  onStatusToggle,
  onItemDelete,
  startInEditMode = false,
}: ItemDetailsDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(startInEditMode)
  const [credits, setCredits] = useState<(MediaCredit | GameCreator)[]>([])
  const [userFollows, setUserFollows] = useState<string[]>([]) // externalIds
  const [loadingCredits, setLoadingCredits] = useState(false)
  
  // Edit states
  const [editTitle, setEditTitle] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editDueDate, setEditDueDate] = useState('')
  const [editDueTime, setEditDueTime] = useState('')

  // Sync edit state when item changes or dialog opens
  useEffect(() => {
    if (item && isOpen) {
      setEditTitle(item.title)
      setEditNotes(item.notes || '')
      setEditColor(item.color || '')
      setEditTags(item.tags || [])
      setEditDueDate(item.dueDate ? format(new Date(item.dueDate), 'yyyy-MM-dd') : '')
      setEditDueTime(item.dueDate ? format(new Date(item.dueDate), 'HH:mm') : '')
      
      if (startInEditMode) {
        setIsEditing(true)
      }

      // Fetch credits and follows
      if (item.type === 'MEDIA' && item.media?.externalId) {
        loadCredits(item)
      }
    }
    if (!isOpen) {
      setIsEditing(false)
      setCredits([])
    }
  }, [item, isOpen, startInEditMode])

  const loadCredits = async (targetItem: ItemWithMedia) => {
    setLoadingCredits(true)
    try {
      const [creditsData, follows] = await Promise.all([
        targetItem.mediaType === 'GAME' 
          ? getGameCreators(targetItem.media!.externalId!)
          : getMediaCredits(targetItem.media!.externalId!, targetItem.mediaType === 'MOVIE' ? 'movie' : 'tv'),
        getFollowsAction()
      ])
      setCredits(creditsData)
      setUserFollows(follows.map(f => f.externalId))
    } catch (error) {
      console.error("Failed to load credits:", error)
    } finally {
      setLoadingCredits(false)
    }
  }

  const handleFollow = async (credit: MediaCredit | GameCreator) => {
    startTransition(async () => {
      const result = await toggleFollowAction({
        externalId: credit.id,
        type: credit.type === 'PERSON' ? FollowType.PERSON : FollowType.STUDIO,
        mediaType: item?.mediaType || MediaType.MOVIE,
        name: credit.name,
        posterPath: credit.profilePath
      })
      
      if (result.success) {
        setUserFollows(prev => 
          result.isFollowing 
            ? [...prev, credit.id] 
            : prev.filter(id => id !== credit.id)
        )
        toast.success(result.isFollowing ? `Following ${credit.name}` : `Unfollowed ${credit.name}`)
      }
    })
  }

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
    if (onItemDelete) {
      onItemDelete(item.id)
      onClose()
    } else {
      if (confirm('Are you sure you want to delete this item?')) {
        startTransition(async () => {
          await deleteItem(item.id, listId)
          onClose()
        })
      }
    }
  }

  const handleUpdate = () => {
    startTransition(async () => {
      await updateItem(item.id, {
        title: editTitle,
        notes: editNotes,
        color: editColor || null,
        tags: editTags,
        dueDate: editDueDate ? new Date(`${editDueDate}T${editDueTime || '00:00'}:00`) : null,
        listId
      })
      setIsEditing(false)
    })
  }

  const toggleStatus = () => {
    if (!canEdit) return
    if (onStatusToggle) {
      onStatusToggle(item)
    } else {
      const nextStatus = item.status === ItemStatus.COMPLETED ? ItemStatus.TODO : ItemStatus.COMPLETED
      startTransition(async () => {
        await updateItemStatus(item.id, nextStatus, listId)
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <div className="flex justify-between items-start pr-8">
            <div className="space-y-1 flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-title" className="text-xs font-bold uppercase text-muted-foreground">Title</Label>
                  <Input 
                    id="edit-title"
                    value={editTitle} 
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-lg font-bold h-auto py-1"
                  />
                </div>
              ) : (
                <DialogTitle className="text-2xl font-bold">{item.title}</DialogTitle>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] uppercase">
                  {item.mediaType || item.type}
                </Badge>
                {item.dueDate && (
                  <span className="text-xs text-muted-foreground font-bold">
                    {format(new Date(item.dueDate), 'MMM d, h:mm a')}
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
                onStatusToggle={onStatusToggle ? () => onStatusToggle(item) : undefined}
                onDelete={onItemDelete ? () => onItemDelete(item.id) : undefined}
                onEdit={() => setIsEditing(true)}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="text-xs font-bold uppercase text-muted-foreground">Description / Notes</Label>
                <Textarea 
                  id="edit-notes"
                  value={editNotes} 
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add details..."
                  className="min-h-[100px] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date" className="text-xs font-bold uppercase text-muted-foreground">Due Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-time" className="text-xs font-bold uppercase text-muted-foreground">Time</Label>
                  <Input
                    id="edit-time"
                    type="time"
                    value={editDueTime}
                    onChange={(e) => setEditDueTime(e.target.value)}
                  />
                </div>
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
                <div className="space-y-6">
                  <div className="flex gap-4 p-4 bg-muted/30 rounded-lg border">
                    <div className="relative h-40 w-28 flex-shrink-0 rounded overflow-hidden shadow-md">
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
                      <p className="text-sm text-muted-foreground line-clamp-4 italic leading-relaxed">
                        {item.notes || "No description provided."}
                      </p>
                      
                      <div className="pt-2">
                        <Button asChild variant="outline" size="sm" className="w-full rounded-xl font-bold uppercase text-[10px] gap-2 border-primary/20 hover:bg-primary/5 shadow-sm">
                          <Link href={`/media/${item.mediaType === 'MOVIE' ? 'movie' : item.mediaType === 'SHOW' ? 'tv' : 'game'}/${item.media.externalId}`}>
                            View Full Details
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Credits & Following Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground opacity-50">
                        {isGame ? 'Creators & Studios' : 'Cast & Crew'}
                      </Label>
                      {loadingCredits && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {credits.map((credit) => {
                        const isFollowing = userFollows.includes(credit.id)
                        return (
                          <div 
                            key={credit.id} 
                            className="flex items-center justify-between p-2 bg-muted/20 rounded-xl border border-transparent hover:border-muted-foreground/10 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted border shrink-0">
                                {credit.profilePath ? (
                                  <Image src={credit.profilePath} alt={credit.name} fill className="object-cover" />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    {credit.type === 'STUDIO' ? <Building2 className="h-4 w-4 opacity-20" /> : <UserPlus className="h-4 w-4 opacity-20" />}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">{credit.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate uppercase font-bold italic">
                                  {credit.type === 'PERSON' ? (credit as MediaCredit).role : 'Studio'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant={isFollowing ? "secondary" : "ghost"}
                              size="icon"
                              className={cn(
                                "h-8 w-8 rounded-full shrink-0 transition-all",
                                isFollowing ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                              )}
                              onClick={() => handleFollow(credit)}
                              disabled={isPending}
                              title={isFollowing ? "Unfollow" : `Follow ${credit.name} for future releases`}
                            >
                              {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                            </Button>
                          </div>
                        )
                      })}
                      {!loadingCredits && credits.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic col-span-full">No credits found for this item.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!isMedia && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Notes</Label>
                  <div className="p-4 bg-muted/30 rounded-lg min-h-[100px] text-sm whitespace-pre-wrap border italic leading-relaxed">
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
