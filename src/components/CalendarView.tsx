'use client'

import { useState, useTransition } from 'react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Item, ItemStatus } from '@prisma/client'
import { updateItemStatus, deleteItem } from '@/actions/item'

interface CalendarViewProps {
  items: Item[]
  listId: string
  onAddClick: (date: Date) => void
}

export default function CalendarView({ items, listId, onAddClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isPending, startTransition] = useTransition()

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const scheduledItems = items.filter((item) => item.dueDate)
  const unscheduledItems = items.filter((item) => !item.dueDate)

  const toggleStatus = (item: Item) => {
    const nextStatus = item.status === ItemStatus.COMPLETED ? ItemStatus.TODO : ItemStatus.COMPLETED
    startTransition(async () => {
      await updateItemStatus(item.id, nextStatus, listId)
    })
  }

  const handleDelete = (item: Item) => {
    if (confirm('Delete this item?')) {
      startTransition(async () => {
        await deleteItem(item.id, listId)
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-background border rounded-xl overflow-hidden shadow-sm">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold capitalize">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-[120px]">
          {calendarDays.map((day, i) => {
            const dayItems = scheduledItems.filter((item) =>
              item.dueDate && isSameDay(new Date(item.dueDate), day)
            )

            return (
              <div
                key={day.toString()}
                className={cn(
                  "border-r border-b p-2 relative group hover:bg-muted/20 transition-colors",
                  !isSameMonth(day, monthStart) && "bg-muted/10 text-muted-foreground/50",
                  i % 7 === 6 && "border-r-0"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    "text-sm font-medium flex items-center justify-center h-6 w-6 rounded-full",
                    isToday(day) && "bg-primary text-primary-foreground",
                  )}>
                    {format(day, 'd')}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onAddClick(day)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "group/item text-[10px] p-1 rounded border flex items-center gap-1",
                        item.status === 'COMPLETED'
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 border-primary/20 text-primary"
                      )}
                    >
                      <button
                        className="flex-shrink-0 leading-none"
                        onClick={() => toggleStatus(item)}
                        disabled={isPending}
                        title={item.status === 'COMPLETED' ? 'Mark incomplete' : 'Mark complete'}
                      >
                        <span className={cn(
                          "inline-block h-2 w-2 rounded-sm border border-current",
                          item.status === 'COMPLETED' && "bg-current"
                        )} />
                      </button>
                      <span className={cn(
                        "truncate flex-1",
                        item.status === 'COMPLETED' && "line-through"
                      )}>
                        {item.title}
                      </span>
                      <button
                        className="flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity"
                        onClick={() => handleDelete(item)}
                        disabled={isPending}
                        title="Delete"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Unscheduled items */}
      {unscheduledItems.length > 0 && (
        <div className="border rounded-xl p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Unscheduled</h3>
          <div className="flex flex-wrap gap-2">
            {unscheduledItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "group/item flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border",
                  item.status === 'COMPLETED'
                    ? "bg-muted text-muted-foreground"
                    : "bg-background"
                )}
              >
                <button
                  onClick={() => toggleStatus(item)}
                  disabled={isPending}
                  title={item.status === 'COMPLETED' ? 'Mark incomplete' : 'Mark complete'}
                >
                  <span className={cn(
                    "inline-block h-3 w-3 rounded-sm border border-current",
                    item.status === 'COMPLETED' && "bg-current"
                  )} />
                </button>
                <span className={cn(item.status === 'COMPLETED' && "line-through")}>
                  {item.title}
                </span>
                <button
                  className="opacity-0 group-hover/item:opacity-100 transition-opacity text-destructive"
                  onClick={() => handleDelete(item)}
                  disabled={isPending}
                  title="Delete"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
