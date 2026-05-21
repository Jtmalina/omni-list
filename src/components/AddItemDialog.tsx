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

export default function AddItemDialog({ listId }: { listId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [type, setType] = useState<ItemType>(ItemType.TASK)
  const [mediaType, setMediaType] = useState<MediaType | undefined>(undefined)
  const [dueDate, setDueDate] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    setLoading(true)
    await createItem({
      title,
      notes: notes || undefined,
      listId,
      type,
      mediaType: type === ItemType.MEDIA ? mediaType : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    })
    setLoading(false)
    setOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setTitle('')
    setNotes('')
    setType(ItemType.TASK)
    setMediaType(undefined)
    setDueDate('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as ItemType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ItemType.TASK}>Task</SelectItem>
                    <SelectItem value={ItemType.MEDIA}>Media</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === ItemType.MEDIA && (
                <div className="space-y-2">
                  <Label>Media Type</Label>
                  <Select
                    value={mediaType}
                    onValueChange={(v) => setMediaType(v as MediaType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MediaType.MOVIE}>Movie</SelectItem>
                      <SelectItem value={MediaType.SHOW}>Show</SelectItem>
                      <SelectItem value={MediaType.GAME}>Game</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
