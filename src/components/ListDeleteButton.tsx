'use client'

import { deleteList } from '@/actions/list'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function ListDeleteButton({ 
  id, 
  title,
  isRedirect = false 
}: { 
  id: string, 
  title?: string,
  isRedirect?: boolean 
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const message = title 
      ? `Are you sure you want to delete the list "${title}" and all its items?`
      : 'Are you sure you want to delete this list and all its items?'
      
    if (confirm(message)) {
      startTransition(async () => {
        await deleteList(id)
        if (isRedirect) {
          router.push('/')
        }
      })
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isPending}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      title="Delete List"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
