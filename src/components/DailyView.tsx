'use client'

import { useMemo } from 'react'
import { format, isSameDay, startOfDay, addHours } from 'date-fns'
import { cn } from '@/lib/utils'
import { Plus, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Item, ItemStatus, MediaMetadata } from '@prisma/client'
import { TagBadge } from './TagBadge'

type ItemWithMedia = Item & {
  media?: MediaMetadata | null
}

interface DailyViewProps {
  items: ItemWithMedia[]
  listId: string
  currentDate: Date
  onAddClick: (date: Date) => void
  onItemClick: (item: ItemWithMedia) => void
  onStatusToggle: (item: Item, e: React.MouseEvent) => void
  onDeleteClick: (item: Item, e: React.MouseEvent) => void
  canEdit: boolean
  tagConfigs: Record<string, string>
  isPending: boolean
}

export default function DailyView({
  items,
  currentDate,
  onAddClick,
  onItemClick,
  onStatusToggle,
  onDeleteClick,
  canEdit,
  tagConfigs,
  isPending
}: DailyViewProps) {
  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i)
  }, [])

  const dayItems = items.filter((item) =>
    item.dueDate && isSameDay(new Date(item.dueDate), currentDate)
  )

  return (
    <div className="bg-background border rounded-3xl flex flex-col h-[700px] overflow-hidden shadow-sm relative">
      {/* Header */}
      <div className="p-6 border-b bg-muted/20 flex justify-between items-center sticky top-0 z-20 backdrop-blur-md">
        <div>
          <h3 className="text-3xl font-black tracking-tighter">
            {format(currentDate, 'EEEE')}
          </h3>
          <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground font-bold">
            {format(currentDate, 'MMMM do, yyyy')}
          </p>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            className="rounded-full gap-2 border-2 font-bold uppercase text-[10px]"
            onClick={() => onAddClick(currentDate)}
          >
            <Plus className="h-4 w-4" />
            Add Note
          </Button>
        )}
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
        <div className="relative">
          {/* Hour Lines */}
          {hours.map((hour) => (
            <div key={hour} className="flex border-b min-h-[80px] group hover:bg-muted/10 transition-colors">
              <div className="w-20 shrink-0 p-4 border-r bg-muted/5 flex flex-col items-center justify-start sticky left-0 z-10">
                <span className="text-xs font-black tabular-nums">
                  {format(addHours(startOfDay(currentDate), hour), 'h a')}
                </span>
              </div>
              <div className="flex-1 relative p-2">
                {/* Find items for this specific hour */}
                {dayItems
                  .filter(item => {
                    const date = new Date(item.dueDate!)
                    return date.getHours() === hour
                  })
                  .map(item => {
                    const itemColor = item.color || (item.tags[0] ? tagConfigs[item.tags[0]] : null)
                    return (
                      <div
                        key={item.id}
                        onClick={() => onItemClick(item)}
                        className={cn(
                          "p-3 rounded-xl border-2 border-l-8 mb-2 cursor-pointer transition-all active:scale-[0.98] shadow-sm hover:shadow-md",
                          !itemColor && "bg-background border-muted"
                        )}
                        style={itemColor ? { 
                          backgroundColor: `${itemColor}10`, 
                          borderLeftColor: itemColor,
                          borderColor: `${itemColor}20` 
                        } : {}}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className={cn(
                              "font-black text-sm uppercase tracking-tight truncate",
                              item.status === 'COMPLETED' && "line-through opacity-40"
                            )}
                            style={{ color: itemColor || 'inherit' }}>
                              {item.title}
                            </h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.tags.map(tag => (
                                <TagBadge key={tag} name={tag} color={tagConfigs[tag]} className="text-[7px] px-1 py-0" />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                             <button
                                onClick={(e) => onStatusToggle(item, e)}
                                disabled={isPending}
                                className={cn(
                                  "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                                  item.status === 'COMPLETED' ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary/50"
                                )}
                              >
                                {item.status === 'COMPLETED' && <div className="w-1.5 h-1.5 bg-current rounded-full" />}
                              </button>
                              {canEdit && (
                                <button
                                  onClick={(e) => onDeleteClick(item, e)}
                                  disabled={isPending}
                                  className="text-destructive p-1 opacity-20 hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating empty state indicator if nothing is scheduled for today */}
      {dayItems.length === 0 && (
        <div className="absolute inset-0 top-[120px] pointer-events-none flex flex-col items-center justify-center opacity-10">
          <Clock className="h-32 w-32 mb-4" />
          <p className="text-4xl font-black uppercase tracking-tighter italic">Day is Clear</p>
        </div>
      )}
    </div>
  )
}
