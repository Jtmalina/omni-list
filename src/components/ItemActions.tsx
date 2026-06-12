'use client'

import { updateItemStatus, deleteItem } from '@/actions/item'
import { downloadMediaAction, removeMediaFromServerAction } from '@/actions/servarr'
import { ItemStatus, MediaType } from '@prisma/client'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Trash2, CloudDownload, CheckCircle2, Loader2, RefreshCw, HardDrive, Edit2 } from 'lucide-react'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'
import { useMediaStatus } from '@/lib/hooks/useMediaStatus'
import { toast } from 'sonner'

export default function ItemActions({
  id,
  status,
  listId,
  mediaType,
  isRadarrEnabled = false,
  isSonarrEnabled = false,
  canEdit = true,
  isOwner = false,
  hideCheckbox = false,
  onStatusToggle,
  onDelete,
  onEdit,
}: {
  id: string
  status: ItemStatus
  listId: string
  mediaType?: MediaType | null
  isRadarrEnabled?: boolean
  isSonarrEnabled?: boolean
  canEdit?: boolean
  isOwner?: boolean
  /** When true, omits the checkbox (caller renders it elsewhere, e.g. poster overlay) */
  hideCheckbox?: boolean
  onStatusToggle?: () => void
  onDelete?: () => void
  onEdit?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  
  const isMovie = mediaType === MediaType.MOVIE
  const isShow = mediaType === MediaType.SHOW
  const servarrEnabled = (isMovie && isRadarrEnabled) || (isShow && isSonarrEnabled)
  
  const { status: mediaStatus, loading: statusLoading, error: statusError, refresh } = useMediaStatus(
    id,
    mediaType,
    servarrEnabled
  )

  const toggleStatus = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation()
    if (!canEdit) return
    if (onStatusToggle) {
      onStatusToggle()
    } else {
      const nextStatus = status === ItemStatus.COMPLETED ? ItemStatus.TODO : ItemStatus.COMPLETED
      startTransition(async () => {
        await updateItemStatus(id, nextStatus, listId)
      })
    }
  }

  const handleDelete = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation()
    if (!canEdit) return
    if (onDelete) {
      onDelete()
    } else {
      if (confirm('Are you sure you want to delete this item?')) {
        startTransition(async () => {
          await deleteItem(id, listId)
        })
      }
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onEdit) onEdit()
  }

  const handleDownload = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation()
    if (!canEdit) return
    startTransition(async () => {
      const result = await downloadMediaAction(id)
      if (result.success) {
        toast.success(result.message)
        refresh() 
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleRefresh = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation()
    toast.promise(refresh(), {
      loading: 'Checking server...',
      success: (data: any) => {
        const s = data as typeof mediaStatus
        if (s?.inLibrary && s?.hasFile) return 'In library ✓'
        if (s?.inLibrary) return 'Monitored — not yet downloaded'
        if (s?.progress !== null) return `Downloading ${s?.progress}%`
        return 'Not in library'
      },
      error: (err: any) => err?.message || 'Could not reach server',
    })
  }

  const isDownloadableType = isMovie || isShow

  return (
    <div className="flex items-center gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
      {isDownloadableType && canEdit && (
        <div className="flex items-center gap-1">
          {statusLoading && !mediaStatus ? (
            <div className="flex items-center justify-center h-8 w-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground opacity-50" />
            </div>
          ) : mediaStatus && mediaStatus.progress !== null ? (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-black animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{mediaStatus.progress}%</span>
            </div>
          ) : mediaStatus?.inLibrary ? (
            <div className="flex items-center gap-1">
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black",
                mediaStatus.hasFile ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
              )}>
                <CheckCircle2 className="h-3 w-3" />
                <span className="hidden sm:inline">{mediaStatus.hasFile ? 'LIBRARY' : 'MONITORED'}</span>
              </div>
              
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Remove from Server"
                  onClick={(e) => {
                    e.stopPropagation()
                    const deleteFiles = confirm('Do you want to delete the actual media files from your hard drive too?')
                    handleRemoveFromServer(deleteFiles)
                  }}
                  disabled={isPending}
                >
                  <HardDrive className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              disabled={isPending || !servarrEnabled}
              title={!servarrEnabled ? "Configure Radarr/Sonarr in settings to download" : "Send to Radarr/Sonarr"}
              className={cn(
                "h-8 w-8 text-primary hover:text-primary hover:bg-primary/10",
                !servarrEnabled && "opacity-30 grayscale cursor-not-allowed"
              )}
            >
              <CloudDownload className="h-4 w-4" />
            </Button>
          )}
          
          {servarrEnabled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={statusLoading}
              title={statusError ? `Error: ${statusError} — click to retry` : 'Refresh Status'}
              className={cn(
                "h-8 w-8 hover:text-foreground",
                statusError ? "text-destructive hover:text-destructive" : "text-muted-foreground"
              )}
            >
              <RefreshCw className={cn("h-3 w-3", statusLoading && "animate-spin")} />
            </Button>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-1 ml-1 sm:ml-0">
        {!hideCheckbox && (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={status === ItemStatus.COMPLETED}
              onCheckedChange={() => toggleStatus()}
              disabled={isPending || !canEdit}
            />
          </div>
        )}
        {canEdit && onEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEdit}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Edit Item"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isPending}
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )

  async function handleRemoveFromServer(deleteFiles: boolean) {
    if (!isOwner || !mediaStatus?.serverId) return
    const result = await removeMediaFromServerAction(id, mediaStatus.serverId!, deleteFiles)
    if (result.success) {
      toast.success(result.message)
      refresh()
    } else {
      toast.error(result.error)
    }
  }
}
