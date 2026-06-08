'use client'

import { useState, useTransition, useEffect, useMemo, useRef } from 'react'
import { format, isSameDay, isToday, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { cn } from '@/lib/utils'
import { Plus, X, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Item, ItemStatus, MediaMetadata } from '@prisma/client'
import { TagBadge } from './TagBadge'
import { Badge } from '@/components/ui/badge'

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
  const containerRef = useRef<HTMLDivElement>(null)

  // Generate a window of 3 weeks (Previous, Current, Next) 
  // each starting from Monday
  const weeks = useMemo(() => {
    const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    return [
      subWeeks(currentWeekStart, 1),
      currentWeekStart,
      addWeeks(currentWeekStart, 1)
    ]
  }, [currentDate])

  // Scroll to current week on load
  useEffect(() => {
    if (containerRef.current) {
      const currentWeekElement = containerRef.current.querySelector('[data-current="true"]')
      if (currentWeekElement) {
        currentWeekElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [weeks])

  const scheduledItems = items.filter((item) => item.dueDate)

  return (
    <div 
      ref={containerRef}
      className="flex overflow-x-auto pb-4 gap-8 snap-x snap-mandatory scrollbar-hide h-[700px]"
    >
      {weeks.map((weekStart) => {
        const isCurrentWeek = isSameDay(weekStart, startOfWeek(currentDate, { weekStartsOn: 1 }))
        const daysInWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

        return (
          <div
            key={weekStart.toString()}
            data-current={isCurrentWeek}
            className="flex-shrink-0 w-[90vw] sm:w-[450px] snap-center flex flex-col gap-4"
          >
            {/* Week Label */}
            <div className="flex items-center gap-2 px-2">
              <CalendarIcon className="h-4 w-4 text-primary opacity-50" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {format(weekStart, 'MMM d')} — {format(daysInWeek[6], 'MMM d, yyyy')}
              </span>
            </div>

            {/* Vertical Days List */}
            <div className="flex-1 bg-muted/20 border-2 rounded-[2.5rem] overflow-hidden flex flex-col divide-y-2 divide-muted/50 shadow-inner">
              {daysInWeek.map((day) => {
                const dayItems = scheduledItems.filter((item) =>
                  item.dueDate && isSameDay(new Date(item.dueDate), day)
                )

                return (
                  <div 
                    key={day.toString()} 
                    className={cn(
                      "flex flex-col p-4 transition-colors",
                      isToday(day) ? "bg-background shadow-md z-10" : "hover:bg-background/40"
                    )}
                  >
                    {/* Day Header */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-lg font-black tabular-nums",
                          isToday(day) ? "text-primary" : "text-foreground"
                        )}>
                          {format(day, 'dd')}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {format(day, 'EEEE')}
                        </span>
                        {isToday(day) && (
                          <Badge className="ml-2 h-4 px-1.5 text-[8px] font-black uppercase bg-primary text-primary-foreground">Today</Badge>
                        )}
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-muted"
                          onClick={() => onAddClick(day)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Day Content */}
                    <div className="space-y-1.5 pl-7 border-l-2 border-muted-foreground/10 ml-2">
                      {dayItems.length > 0 ? (
                        dayItems.map((item) => {
                          const itemColor = item.color || (item.tags[0] ? tagConfigs[item.tags[0]] : null)
                          return (
                            <div
                              key={item.id}
                              onClick={() => onItemClick(item)}
                              className="group flex items-center justify-between gap-3 p-1.5 -ml-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div 
                                  className="h-2 w-2 rounded-full shrink-0" 
                                  style={{ backgroundColor: itemColor || 'var(--primary)' }}
                                />
                                <span className={cn(
                                  "text-sm font-bold truncate tracking-tight",
                                  item.status === 'COMPLETED' && "line-through opacity-30 font-medium"
                                )}>
                                  {item.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-1" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={(e) => onStatusToggle(item, e)}
                                  className={cn(
                                    "h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                                    item.status === 'COMPLETED' ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary"
                                  )}
                                >
                                  {item.status === 'COMPLETED' && <div className="w-1.5 h-1.5 bg-current rounded-sm" />}
                                </button>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-[10px] text-muted-foreground/40 font-mono italic py-1">Nothing scheduled</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
