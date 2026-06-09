'use client'

import { useMemo, useEffect, useRef } from 'react'
import { format, isSameDay, startOfDay, addHours, addDays, subDays, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { Plus, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Item, ItemStatus, MediaMetadata } from '@prisma/client'
import { TagBadge } from './TagBadge'
import ItemActions from './ItemActions'

type ItemWithMedia = Item & {
  media?: MediaMetadata | null
}

interface DailyViewProps {
  items: ItemWithMedia[]
  listId: string
  currentDate: Date
  onAddClick: (date: Date) => void
  onItemClick: (item: ItemWithMedia) => void
  onStatusToggle: (item: Item) => void
  onDeleteClick: (item: Item) => void
  onEditClick: (item: ItemWithMedia) => void
  canEdit: boolean
  isOwner?: boolean
  tagConfigs: Record<string, string>
  isPending: boolean
}

export default function DailyView({
  items,
  listId,
  currentDate,
  onAddClick,
  onItemClick,
  onStatusToggle,
  onDeleteClick,
  onEditClick,
  canEdit,
  isOwner = false,
  tagConfigs,
  isPending
}: DailyViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i)
  }, [])

  // Generate a window of days (e.g., 7 days before and after the current date)
  const slidingDays = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => addDays(subDays(currentDate, 7), i))
  }, [currentDate])

  // Scroll to the current day on load or when currentDate changes
  useEffect(() => {
    if (containerRef.current) {
      const currentDayElement = containerRef.current.querySelector('[data-current="true"]')
      if (currentDayElement) {
        currentDayElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [currentDate])

  const scheduledItems = items.filter((item) => item.dueDate)

  return (
    <div 
      ref={containerRef}
      className="flex overflow-x-auto pb-4 gap-6 snap-x snap-mandatory scrollbar-hide"
    >
      {slidingDays.map((day) => {
        const isSelected = isSameDay(day, currentDate)
        const dayItems = scheduledItems.filter((item) =>
          item.dueDate && isSameDay(new Date(item.dueDate), day)
        )

        return (
          <div
            key={day.toString()}
            data-current={isSelected}
            className={cn(
              "flex-shrink-0 w-[90vw] sm:w-[350px] snap-center bg-background border-2 rounded-[2rem] flex flex-col h-[700px] overflow-hidden shadow-lg transition-all",
              isToday(day) ? "border-primary shadow-primary/10" : "border-muted"
            )}
          >
            {/* Day Header */}
            <div className={cn(
              "p-6 border-b flex justify-between items-center sticky top-0 z-20 backdrop-blur-md",
              isToday(day) ? "bg-primary/5" : "bg-muted/20"
            )}>
              <div>
                <h3 className="text-2xl font-black tracking-tighter">
                  {format(day, 'EEEE')}
                </h3>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
                  {format(day, 'MMM do, yyyy')}
                </p>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-background border shadow-sm"
                  onClick={() => onAddClick(day)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Time Grid */}
            <div className="flex-1 overflow-y-auto p-0 scrollbar-hide relative">
              {/* Hour Lines */}
              {hours.map((hour) => (
                <div key={hour} className="flex border-b min-h-[100px] group hover:bg-muted/5 transition-colors">
                  <div className="w-16 shrink-0 p-4 border-r bg-muted/5 flex flex-col items-center justify-start sticky left-0 z-10">
                    <span className="text-[10px] font-black tabular-nums opacity-40">
                      {format(addHours(startOfDay(day), hour), 'h a')}
                    </span>
                  </div>
                  <div className="flex-1 relative p-2 space-y-2">
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
                              "p-3 rounded-2xl border-2 border-l-8 cursor-pointer transition-all active:scale-[0.98] shadow-sm hover:shadow-md bg-background group/item relative",
                              !itemColor && "border-muted"
                            )}
                            style={itemColor ? { 
                              backgroundColor: `${itemColor}05`, 
                              borderLeftColor: itemColor,
                              borderColor: `${itemColor}20` 
                            } : {}}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className={cn(
                                  "font-black text-sm uppercase tracking-tight truncate",
                                  item.status === 'COMPLETED' && "line-through opacity-40"
                                )}
                                style={{ color: itemColor || 'inherit' }}>
                                  {item.title}
                                </h4>
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {item.tags.slice(0, 2).map(tag => (
                                    <TagBadge key={tag} name={tag} color={tagConfigs[tag]} className="text-[7px] px-1.5 py-0" />
                                  ))}
                                </div>
                              </div>
                              
                              <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <ItemActions 
                                  id={item.id}
                                  status={item.status}
                                  listId={listId}
                                  mediaType={item.mediaType}
                                  canEdit={canEdit}
                                  isOwner={isOwner}
                                  onStatusToggle={() => onStatusToggle(item)}
                                  onDelete={() => onDeleteClick(item)}
                                  onEdit={() => onEditClick(item)}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}

              {dayItems.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-5 pointer-events-none">
                  <Clock className="h-24 w-24 mb-2" />
                  <p className="text-2xl font-black uppercase tracking-tighter italic">Clear</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
