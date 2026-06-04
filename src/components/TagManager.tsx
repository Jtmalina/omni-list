'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagBadge } from './TagBadge'
import { upsertTagConfig } from '@/actions/list'
import { cn } from '@/lib/utils'
import { X, Plus, Palette } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface TagManagerProps {
  listId: string
  tags: string[]
  onChange: (tags: string[]) => void
  tagConfigs: Record<string, string> // Map of tag name to color hex
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#ef4444', // Red
  '#f59e0b', // Yellow
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
]

export function TagManager({ listId, tags, onChange, tagConfigs }: TagManagerProps) {
  const [newTag, setNewTag] = useState('')

  const handleAddTag = (e?: React.FormEvent) => {
    e?.preventDefault()
    const tag = newTag.trim()
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove))
  }

  const handleUpdateColor = async (tagName: string, color: string) => {
    await upsertTagConfig(listId, tagName, color)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="text-xs font-bold uppercase text-muted-foreground">Tags & Colors</Label>
      </div>
      
      <div className="flex flex-wrap gap-2 min-h-[32px] p-2 border rounded-lg bg-muted/20">
        {tags.map((tag) => (
          <div key={tag} className="flex items-center gap-1 group">
            <Popover>
              <PopoverTrigger asChild>
                <div className="cursor-pointer">
                  <TagBadge 
                    name={tag} 
                    color={tagConfigs[tag]} 
                    onRemove={() => handleRemoveTag(tag)}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Pick color for "{tag}"</p>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => handleUpdateColor(tag, c)}
                        className={cn(
                          "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                          tagConfigs[tag] === c ? "border-primary" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => handleUpdateColor(tag, '')}
                    className="w-full py-1.5 text-[10px] font-bold uppercase border rounded hover:bg-muted"
                  >
                    Clear Color
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ))}
        {tags.length === 0 && <span className="text-[10px] text-muted-foreground italic my-auto">No tags added</span>}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="New tag..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
          className="text-xs h-8"
        />
        <button
          type="button"
          onClick={() => handleAddTag()}
          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground border"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
