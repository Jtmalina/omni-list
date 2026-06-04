'use client'

import { updateItemStatus, deleteItem } from '@/actions/item'
import { downloadMediaAction } from '@/actions/servarr'
import { ItemStatus, MediaType } from '@prisma/client'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Trash2, CloudDownload, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
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
}: {
  id: string
  status: ItemStatus
  listId: string
  mediaType?: MediaType | null
  isRadarrEnabled?: boolean
  isSonarrEnabled?: boolean
  canEdit?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  
  const isMovie = mediaType === MediaType.MOVIE
  const isShow = mediaType === MediaType.SHOW
  const servarrEnabled = (isMovie && isRadarrEnabled) || (isShow && isSonarrEnabled)
  
  const { status: mediaStatus, loading: statusLoading, refresh } = useMediaStatus(
    id, 
    mediaType, 
    servarrEnabled
  )

  const toggleStatus = () => {
    if (!canEdit) return
    const nextStatus = status === ItemStatus.COMPLETED ? ItemStatus.TODO : ItemStatus.COMPLETED
    startTransition(async () => {
      await updateItemStatus(id, nextStatus, listId)
    })
  }

  const handleDelete = () => {
    if (!canEdit) return
    if (confirm('Are you sure you want to delete this item?')) {
      startTransition(async () => {
        await deleteItem(id, listId)
      })
    }
  }

  const handleDownload = () => {
    if (!canEdit) return
    startTransition(async () => {
      const result = await downloadMediaAction(id)
      if (result.success) {
        toast.success(result.message)
        refresh() // Update status immediately
      } else {
        toast.error(result.error)
      }
    })
  }

  const isDownloadableType = isMovie || isShow

  return (
    <div className="flex items-center gap-1 sm:gap-2">
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
          ) : mediaStatus?.hasFile ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 rounded-md text-[10px] font-black">
              <CheckCircle2 className="h-3 w-3" />
              <span className="hidden sm:inline">LIBRARY</span>
            </div>
          ) : mediaStatus?.inLibrary ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-600 rounded-md text-[10px] font-black">
              <CheckCircle2 className="h-3 w-3" />
              <span className="hidden sm:inline">MONITORED</span>
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
              onClick={() => {
                toast.promise(refresh(), {
                  loading: 'Updating status...',
                  success: 'Status updated',
                  error: 'Could not reach server',
                })
              }}
              disabled={statusLoading}
              title="Refresh Status"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("h-3 w-3", statusLoading && "animate-spin")} />
            </Button>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-1 ml-1 sm:ml-0">
        <Checkbox
          checked={status === ItemStatus.COMPLETED}
          onCheckedChange={toggleStatus}
          disabled={isPending || !canEdit}
        />
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
}
