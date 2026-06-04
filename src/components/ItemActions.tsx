'use client'

import { updateItemStatus, deleteItem } from '@/actions/item'
import { downloadMediaAction } from '@/actions/servarr'
import { ItemStatus, MediaType } from '@prisma/client'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Trash2, CloudDownload } from 'lucide-react'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'

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
        alert(result.message)
      } else {
        alert(`Error: ${result.error}`)
      }
    })
  }

  const isMovie = mediaType === MediaType.MOVIE
  const isShow = mediaType === MediaType.SHOW
  const canDownload = canEdit && ((isMovie && isRadarrEnabled) || (isShow && isSonarrEnabled))
  const isDownloadableType = isMovie || isShow

  return (
    <div className="flex items-center gap-2">
      {isDownloadableType && canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          disabled={isPending || !canDownload}
          title={!canDownload ? "Configure Radarr/Sonarr in settings to download" : "Send to Radarr/Sonarr"}
          className={cn(
            "text-primary hover:text-primary hover:bg-primary/10",
            !canDownload && "opacity-30 grayscale cursor-not-allowed"
          )}
        >
          <CloudDownload className="h-4 w-4" />
        </Button>
      )}
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
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
