'use client'

import { useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Item, ItemStatus, MediaMetadata } from '@prisma/client'
import { TagBadge } from './TagBadge'

type ItemWithMedia = Item & {
  media?: MediaMetadata | null
}

interface WeeklyViewProps {
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

export default function WeeklyView({
  items,
  currentDate,
  onAddClick,
  onItemClick,
  onStatusToggle,
  onDeleteClick,
  canEdit,
  tagConfigs,
  isPending
}: WeeklyViewProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentDate])

  const scheduledItems = items.filter((item) => item.dueDate)

  return (
    <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory scrollbar-hide">
      {weekDays.map((day) => {
        const dayItems = scheduledItems.filter((item) =>
          item.dueDate && isSameDay(new Date(item.dueDate), day)
        )

        return (
          <div
            key={day.toString()}
            className={cn(
              "flex-shrink-0 w-[85vw] sm:w-[300px] snap-center bg-background border rounded-2xl flex flex-col h-[500px] shadow-sm transition-all",
              isToday(day) && "ring-2 ring-primary ring-offset-2"
            )}
          >
            {/* Day Header */}
            <div className={cn(
              "p-4 border-b flex justify-between items-center",
              isToday(day) ? "bg-primary/5" : "bg-muted/30"
            )}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                  {format(day, 'EEEE')}
                </p>
                <h3 className="text-2xl font-black tabular-nums">
                  {format(day, 'MMM d')}
                </h3>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-background"
                  onClick={() => onAddClick(day)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              )}
            </div>

            {/* Day Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {dayItems.length > 0 ? (
                dayItems.map((item) => {
                  const itemColor = item.color || (item.tags[0] ? tagConfigs[item.tags[0]] : null)
                  const style = itemColor ? {
                    backgroundColor: `${itemColor}15`,
                    borderLeftColor: itemColor,
                  } : {}

                  return (
                    <div
                      key={item.id}
                      onClick={() => onItemClick(item)}
                      className={cn(
                        "group p-3 rounded-xl border border-l-4 flex flex-col gap-2 cursor-pointer transition-all active:scale-[0.98]",
                        !itemColor && "bg-muted/50 border-muted-foreground/20"
                      )}
                      style={style}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={cn(
                            "font-bold text-sm leading-tight truncate",
                            item.status === 'COMPLETED' && "line-through opacity-40"
                          )}
                          style={{ color: itemColor || 'inherit' }}>
                            {item.title}
                          </h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.tags.slice(0, 2).map(tag => (
                              <TagBadge key={tag} name={tag} color={tagConfigs[tag]} className="text-[8px] px-1 py-0" />
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={(e) => onStatusToggle(item, e)}
                          disabled={isPending}
                          className="flex-shrink-0"
                        >
                          <div className={cn(
                            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            item.status === 'COMPLETED' 
                              ? "bg-primary border-primary text-primary-foreground" 
                              : "border-muted-foreground/30"
                          )}>
                            {item.status === 'COMPLETED' && <div className="w-2 h-2 bg-current rounded-full" />}
                          </div>
                        </button>
                      </div>
                      
                      {item.notes && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 italic">
                          {item.notes}
                        </p>
                      )}

                      {canEdit && (
                        <button
                          onClick={(e) => onDeleteClick(item, e)}
                          disabled={isPending}
                          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-destructive p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 italic space-y-2">
                  <p className="text-sm font-mono uppercase">Quiet Day</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
