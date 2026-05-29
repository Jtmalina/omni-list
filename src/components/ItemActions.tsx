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
}: {
  id: string
  status: ItemStatus
  listId: string
  mediaType?: MediaType | null
  isRadarrEnabled?: boolean
  isSonarrEnabled?: boolean
}) {
  const [isPending, startTransition] = useTransition()

  const toggleStatus = () => {
    const nextStatus = status === ItemStatus.COMPLETED ? ItemStatus.TODO : ItemStatus.COMPLETED
    startTransition(async () => {
      await updateItemStatus(id, nextStatus, listId)
    })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this item?')) {
      startTransition(async () => {
        await deleteItem(id, listId)
      })
    }
  }

  const handleDownload = () => {
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
  const canDownload = (isMovie && isRadarrEnabled) || (isShow && isSonarrEnabled)
  const isDownloadableType = isMovie || isShow

  return (
    <div className="flex items-center gap-2">
      {isDownloadableType && (
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
        disabled={isPending}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={isPending}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
