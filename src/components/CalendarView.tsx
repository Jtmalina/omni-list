'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
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
  isToday,
  addWeeks,
  subWeeks,
  addDays,
  subDays
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, LayoutList, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Item, ItemStatus, MediaMetadata } from '@prisma/client'
import { updateItemStatus, deleteItem } from '@/actions/item'
import ItemDetailsDialog from './ItemDetailsDialog'
import WeeklyView from './WeeklyView'
import DailyView from './DailyView'

type ItemWithMedia = Item & {
  media?: MediaMetadata | null
}

interface CalendarViewProps {
  items: ItemWithMedia[]
  listId: string
  onAddClick: (date: Date) => void
  isRadarrEnabled?: boolean
  isSonarrEnabled?: boolean
  canEdit?: boolean
  isOwner?: boolean
  tagConfigs?: Record<string, string>
  allExistingTags?: string[]
}

type ViewMode = 'MONTH' | 'WEEK' | 'DAY'

export default function CalendarView({ 
  items, 
  listId, 
  onAddClick,
  isRadarrEnabled,
  isSonarrEnabled,
  canEdit = true,
  isOwner = false,
  tagConfigs = {},
  allExistingTags = []
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH')
  const [hasManuallySwitched, setHasManuallySwitched] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isPending, startTransition] = useTransition()
  const [selectedItem, setSelectedItem] = useState<ItemWithMedia | null>(null)

  // Responsive switching - only if user hasn't chosen a view manually
  useEffect(() => {
    const handleResize = () => {
      if (hasManuallySwitched) return
      
      if (window.innerWidth < 640) {
        setViewMode('DAY')
      } else if (window.innerWidth < 1024) {
        setViewMode('WEEK')
      } else {
        setViewMode('MONTH')
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [hasManuallySwitched])

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setHasManuallySwitched(true)
  }

  const next = () => {
    if (viewMode === 'MONTH') setCurrentDate(addMonths(currentDate, 1))
    else if (viewMode === 'WEEK') setCurrentDate(addWeeks(currentDate, 1))
    else setCurrentDate(addDays(currentDate, 1))
  }

  const prev = () => {
    if (viewMode === 'MONTH') setCurrentDate(subMonths(currentDate, 1))
    else if (viewMode === 'WEEK') setCurrentDate(subWeeks(currentDate, 1))
    else setCurrentDate(subDays(currentDate, 1))
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const scheduledItems = items.filter((item) => item.dueDate)
  const unscheduledItems = items.filter((item) => !item.dueDate)

  const toggleStatus = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canEdit) return
    const nextStatus = item.status === ItemStatus.COMPLETED ? ItemStatus.TODO : ItemStatus.COMPLETED
    startTransition(async () => {
      await updateItemStatus(item.id, nextStatus, listId)
    })
  }

  const handleDelete = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canEdit) return
    if (confirm('Delete this item?')) {
      startTransition(async () => {
        await deleteItem(item.id, listId)
      })
    }
  }

  const handleItemClick = (item: ItemWithMedia) => {
    setSelectedItem(item)
  }

  return (
    <div className="space-y-4">
      <ItemDetailsDialog
        item={selectedItem}
        listId={listId}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        isRadarrEnabled={isRadarrEnabled}
        isSonarrEnabled={isSonarrEnabled}
        canEdit={canEdit}
        isOwner={isOwner}
        tagConfigs={tagConfigs}
        allExistingTags={allExistingTags}
      />
      
      {/* Calendar Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black uppercase tracking-tighter tabular-nums min-w-[200px]">
            {viewMode === 'MONTH' ? format(currentDate, 'MMMM yyyy') : 
             viewMode === 'WEEK' ? `Week of ${format(startOfWeek(currentDate), 'MMM d')}` :
             format(currentDate, 'MMMM d, yyyy')}
          </h2>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={prev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 rounded-full px-4 text-[10px] font-bold uppercase" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={next}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex bg-muted p-1 rounded-full border shadow-inner overflow-hidden">
          {[
            { id: 'MONTH', label: 'Month', icon: CalendarIcon },
            { id: 'WEEK', label: 'Week', icon: LayoutList },
            { id: 'DAY', label: 'Day', icon: Clock }
          ].map((mode) => {
            const Icon = mode.icon
            const isActive = viewMode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id as ViewMode)}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  isActive ? "bg-background text-foreground shadow-sm scale-[1.02]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main View Area */}
      <div className="transition-all duration-300">
        {viewMode === 'MONTH' && (
          <div className="bg-background border rounded-3xl overflow-hidden shadow-sm">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                  {day}
                </div>
              ))}
            </div>

            {/* Monthly Grid */}
            <div className="grid grid-cols-7 auto-rows-[120px]">
              {calendarDays.map((day, i) => {
                const dayItems = scheduledItems.filter((item) =>
                  item.dueDate && isSameDay(new Date(item.dueDate), day)
                )

                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "border-r border-b p-2 relative group hover:bg-muted/10 transition-colors",
                      !isSameMonth(day, monthStart) && "bg-muted/10 text-muted-foreground/30",
                      i % 7 === 6 && "border-r-0"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={cn(
                        "text-xs font-black h-6 w-6 flex items-center justify-center rounded-full tabular-nums",
                        isToday(day) && "bg-primary text-primary-foreground",
                      )}>
                        {format(day, 'd')}
                      </span>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-background"
                          onClick={() => onAddClick(day)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide px-0.5">
                      {dayItems.map((item) => {
                        const itemColor = item.color || (item.tags[0] ? tagConfigs[item.tags[0]] : null)
                        const style = itemColor ? {
                          backgroundColor: `${itemColor}20`,
                          color: itemColor,
                          borderColor: `${itemColor}40`,
                        } : {}

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className={cn(
                              "group/item text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 cursor-pointer transition-colors font-bold uppercase tracking-tight",
                              !itemColor && (item.status === 'COMPLETED'
                                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20")
                            )}
                            style={style}
                          >
                            <span className={cn(
                              "truncate flex-1",
                              item.status === 'COMPLETED' && "line-through opacity-40"
                            )}>
                              {item.title}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {viewMode === 'WEEK' && (
          <WeeklyView 
            items={items}
            listId={listId}
            currentDate={currentDate}
            onAddClick={onAddClick}
            onItemClick={handleItemClick}
            onStatusToggle={toggleStatus}
            onDeleteClick={handleDelete}
            canEdit={canEdit}
            tagConfigs={tagConfigs}
            isPending={isPending}
          />
        )}

        {viewMode === 'DAY' && (
          <DailyView 
            items={items}
            listId={listId}
            currentDate={currentDate}
            onAddClick={onAddClick}
            onItemClick={handleItemClick}
            onStatusToggle={toggleStatus}
            onDeleteClick={handleDelete}
            canEdit={canEdit}
            tagConfigs={tagConfigs}
            isPending={isPending}
          />
        )}
      </div>

      {/* Unscheduled section only in MONTH view for cleaner look elsewhere */}
      {viewMode === 'MONTH' && unscheduledItems.length > 0 && (
        <div className="border-2 border-dashed rounded-3xl p-6 mt-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-50 mb-6 flex items-center gap-2">
            <LayoutList className="h-3 w-3" />
            Floating Tasks
          </h3>
          <div className="flex flex-wrap gap-3">
            {unscheduledItems.map((item) => {
              const itemColor = item.color || (item.tags[0] ? tagConfigs[item.tags[0]] : null)
              const style = itemColor ? {
                backgroundColor: `${itemColor}15`,
                color: itemColor,
                borderColor: `${itemColor}30`,
              } : {}

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "group/item flex items-center gap-3 text-[10px] font-black uppercase tracking-tight px-4 py-2 rounded-full border-2 cursor-pointer transition-all hover:scale-105 shadow-sm active:scale-95",
                    !itemColor && (item.status === 'COMPLETED'
                      ? "bg-muted text-muted-foreground hover:bg-muted/80 border-transparent"
                      : "bg-background hover:bg-muted/20 border-muted")
                  )}
                  style={style}
                >
                  <button
                    onClick={(e) => toggleStatus(item, e)}
                    disabled={isPending || !canEdit}
                  >
                    <div className={cn(
                      "h-3 w-3 rounded-full border-2 flex items-center justify-center transition-colors",
                      item.status === 'COMPLETED' ? "bg-current border-current text-primary-foreground" : "border-current opacity-30"
                    )}>
                      {item.status === 'COMPLETED' && <div className="w-1 h-1 bg-current rounded-full" />}
                    </div>
                  </button>
                  <span className={cn(item.status === 'COMPLETED' && "line-through opacity-40")}>
                    {item.title}
                  </span>
                  {canEdit && (
                    <button
                      className="opacity-0 group-hover/item:opacity-100 transition-opacity text-destructive ml-1"
                      onClick={(e) => handleDelete(item, e)}
                      disabled={isPending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
