'use client'

import { updateItemStatus, deleteItem } from '@/actions/item'
import { ItemStatus } from '@prisma/client'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useTransition } from 'react'

export default function ItemActions({
  id,
  status,
  listId,
}: {
  id: string
  status: ItemStatus
  listId: string
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

  return (
    <div className="flex items-center gap-2">
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
