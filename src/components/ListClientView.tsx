'use client'

import { useState, useMemo, useOptimistic, useTransition } from 'react'
import { Item, ItemStatus, ListType, MediaMetadata, MediaType } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import AddItemDialog from '@/components/AddItemDialog'
import ItemActions from '@/components/ItemActions'
import { Star, Film, Tv, Gamepad2, LayoutGrid, MoreHorizontal, ChevronRight, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import CalendarView from './CalendarView'
import { Input } from '@/components/ui/input'
import { TagBadge } from './TagBadge'
import ItemDetailsDialog from './ItemDetailsDialog'
import { updateItemStatus, deleteItem } from '@/actions/item'
import { useRealtimeSync } from '@/lib/hooks/useRealtimeSync'
import { useRouter } from 'next/navigation'

type ItemWithMedia = Item & {
  media?: MediaMetadata | null
}

interface StreamingProvider {
  provider_id: number
  provider_name: string
  logo_path: string
}

interface StreamingInfo {
  flatrate?: StreamingProvider[]
}

interface GameInfo {
  metacritic?: number
  esrb?: string
  platforms?: string[]
  stores?: string[]
}

interface ListClientViewProps {
  list: {
    id: string
    title: string
    type: ListType
    tagConfigs?: { name: string, color: string }[]
  }
  items: ItemWithMedia[]
  servarrConfig?: {
    radarrUrl?: string | null
    radarrApiKey?: string | null
    sonarrUrl?: string | null
    sonarrApiKey?: string | null
  } | null
  isOwner?: boolean
  accessLevel?: 'OWNER' | 'VIEW' | 'EDIT' | null
}

type FilterCategory = 'ALL' | 'MOVIE' | 'SHOW' | 'GAME' | 'OTHER'

export default function ListClientView({ 
  list, 
  items, 
  servarrConfig,
  isOwner = false,
  accessLevel = null
}: ListClientViewProps) {
  const router = useRouter()
  // Enable live sync for this list
  useRealtimeSync(list.id)

  const [isPending, startTransition] = useTransition()
  
  // Optimistic State
  const [optimisticItems, addOptimisticAction] = useOptimistic(
    items,
    (state, action: { type: 'TOGGLE' | 'DELETE', id: string, status?: ItemStatus }) => {
      if (action.type === 'TOGGLE') {
        return state.map(item => 
          item.id === action.id ? { ...item, status: action.status! } : item
        )
      }
      if (action.type === 'DELETE') {
        return state.filter(item => item.id !== action.id)
      }
      return state
    }
  )

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedItem, setSelectedItem] = useState<ItemWithMedia | null>(null)

  const tagConfigsMap = useMemo(() => {
    const map: Record<string, string> = {}
    list.tagConfigs?.forEach(config => {
      map[config.name] = config.color
    })
    return map
  }, [list.tagConfigs])


  const { allTags, allColors } = useMemo(() => {
    const tags = new Set<string>()
    const colors = new Set<string>()
    optimisticItems.forEach(item => {
      item.tags.forEach(t => tags.add(t))
      if (item.color) colors.add(item.color)
    })
    return { allTags: Array.from(tags), allColors: Array.from(colors) }
  }, [optimisticItems])

  const isRadarrEnabled = !!(servarrConfig?.radarrUrl && servarrConfig?.radarrApiKey)
  const isSonarrEnabled = !!(servarrConfig?.sonarrUrl && servarrConfig?.sonarrApiKey)

  const canEdit = isOwner || accessLevel === 'EDIT'

  const isMediaList = list.type === 'MEDIA'
  const isCalendarList = list.type === 'CALENDAR'

  const filteredItems = useMemo(() => {
    let result = optimisticItems

    if (activeCategory === 'MOVIE') result = result.filter(i => i.mediaType === 'MOVIE')
    else if (activeCategory === 'SHOW') result = result.filter(i => i.mediaType === 'SHOW')
    else if (activeCategory === 'GAME') result = result.filter(i => i.mediaType === 'GAME')
    else if (activeCategory === 'OTHER') result = result.filter(i => i.type !== 'MEDIA')

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(i => i.title.toLowerCase().includes(query))
    }

    if (selectedTags.length > 0) {
      result = result.filter(item => 
        selectedTags.every(tag => item.tags.includes(tag))
      )
    }

    if (selectedColors.length > 0) {
      result = result.filter(item => 
        item.color && selectedColors.includes(item.color)
      )
    }

    return result
  }, [optimisticItems, activeCategory, searchQuery, selectedTags, selectedColors])

  const sidebarItems = [
    { id: 'ALL', label: 'All Media', icon: LayoutGrid },
    { id: 'MOVIE', label: 'Movies', icon: Film },
    { id: 'SHOW', label: 'TV Shows', icon: Tv },
    { id: 'GAME', label: 'Games', icon: Gamepad2 },
    { id: 'OTHER', label: 'Other', icon: MoreHorizontal },
  ]

  const postItColors = [
    'bg-yellow-100 border-yellow-200 text-yellow-900',
    'bg-blue-100 border-blue-200 text-blue-900',
    'bg-green-100 border-green-200 text-green-900',
    'bg-pink-100 border-pink-200 text-pink-900',
    'bg-purple-100 border-purple-200 text-purple-900',
  ]

  const handleAddClick = (date: Date) => {
    if (!canEdit) return
    setSelectedDate(new Date(date))
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedDate(undefined)
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const toggleColor = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    )
  }

  const handleStatusToggle = (item: Item) => {
    const nextStatus = item.status === ItemStatus.COMPLETED ? ItemStatus.TODO : ItemStatus.COMPLETED
    startTransition(async () => {
      addOptimisticAction({ type: 'TOGGLE', id: item.id, status: nextStatus })
      await updateItemStatus(item.id, nextStatus, list.id)
    })
  }

  const handleItemDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      startTransition(async () => {
        addOptimisticAction({ type: 'DELETE', id })
        await deleteItem(id, list.id)
      })
    }
  }

  const handleItemClick = (item: ItemWithMedia) => {
    if (list.type === 'MEDIA' && item.media?.externalId) {
      const type = item.mediaType === 'MOVIE' ? 'movie' : item.mediaType === 'SHOW' ? 'tv' : 'game'
      router.push(`/media/${type}/${item.media.externalId}`)
    } else {
      setSelectedItem(item)
    }
  }

  if (isCalendarList) {
    return (
      <>
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">{list.title}</h1>
            <p className="text-muted-foreground font-mono">
              {optimisticItems.length} items tracking
              {!isOwner && accessLevel && <span className="ml-2 opacity-50">• {accessLevel} access</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <AddItemDialog 
                key={selectedDate ? `date-${selectedDate.getTime()}` : 'header'}
                listId={list.id} 
                initialDate={selectedDate} 
                onOpenChange={handleOpenChange}
                tagConfigs={tagConfigsMap}
                allExistingTags={allTags}
              />
            )}
          </div>
        </div>
        <CalendarView 
          items={filteredItems} 
          listId={list.id} 
          onAddClick={handleAddClick}
          isRadarrEnabled={isRadarrEnabled}
          isSonarrEnabled={isSonarrEnabled}
          canEdit={canEdit}
          isOwner={isOwner}
          tagConfigs={tagConfigsMap}
          allExistingTags={allTags}
          onStatusToggle={handleStatusToggle}
          onItemDelete={handleItemDelete}
          onItemClick={handleItemClick}
        />
        <ItemDetailsDialog
          item={selectedItem}
          listId={list.id}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          canEdit={canEdit}
          isOwner={isOwner}
          tagConfigs={tagConfigsMap}
          allExistingTags={allTags}
          onStatusToggle={handleStatusToggle}
          onItemDelete={handleItemDelete}
        />
      </>
    )
  }

  // Modern Clean Layout with Thumbtacks for TODO Lists
  if (!isMediaList) {
    return (
      <div className="space-y-8">
        <ItemDetailsDialog
          item={selectedItem}
          listId={list.id}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          canEdit={canEdit}
          isOwner={isOwner}
          tagConfigs={tagConfigsMap}
          allExistingTags={allTags}
          onStatusToggle={handleStatusToggle}
          onItemDelete={handleItemDelete}
        />
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">{list.title}</h1>
            <p className="text-muted-foreground font-mono text-xs font-bold uppercase tracking-widest mt-1">
              {filteredItems.length} of {optimisticItems.length} notes pinned
              {accessLevel && accessLevel !== 'OWNER' && <span className="ml-2 opacity-50">• {accessLevel} access</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <AddItemDialog 
                listId={list.id} 
                onOpenChange={handleOpenChange}
                tagConfigs={tagConfigsMap}
                allExistingTags={allTags}
              />
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-11 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.map((item, index) => {
            const colorClass = postItColors[index % postItColors.length]
            const rotationClass = index % 2 === 0 ? 'rotate-1' : '-rotate-1'
            
            // Priority: Item Color > Tag Color > Preset Color
            const baseColor = item.color || (item.tags[0] ? tagConfigsMap[item.tags[0]] : null)
            const style = baseColor ? {
              backgroundColor: `${baseColor}1A`, // 10% opacity for the "paper" feel
              borderTopColor: baseColor,
            } : {}

            return (
              <div 
                key={item.id} 
                onClick={() => handleItemClick(item)}
                className={cn(
                  "transition-transform hover:rotate-0 hover:scale-105 duration-200 relative pt-4 cursor-pointer",
                  rotationClass
                )}
              >
                {/* Visual Thumbtack - Pinned directly to the card */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-4 h-4 rounded-full bg-red-600 shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_-2px_4px_rgba(0,0,0,0.2)] border border-red-700 after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-1.5 after:h-1.5 after:bg-white/30 after:rounded-full" />
                
                <Card 
                  className={cn(
                    "h-64 shadow-xl border-t-8 border-none flex flex-col relative overflow-hidden",
                    !baseColor && colorClass,
                    item.status === 'COMPLETED' ? 'opacity-40 grayscale-[0.5]' : ''
                  )}
                  style={style}
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end" onClick={(e) => e.stopPropagation()}>
                      <ItemActions 
                        id={item.id} 
                        status={item.status} 
                        listId={list.id} 
                        mediaType={item.mediaType} 
                        isRadarrEnabled={isRadarrEnabled} 
                        isSonarrEnabled={isSonarrEnabled}
                        canEdit={canEdit}
                        isOwner={isOwner}
                        onStatusToggle={() => handleStatusToggle(item)}
                        onDelete={() => handleItemDelete(item.id)}
                      />
                    </div>

                    <div className="mt-4 flex-1 overflow-hidden">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.tags.map(tag => (
                          <TagBadge key={tag} name={tag} color={tagConfigsMap[tag]} className="text-[8px] px-1.5 py-0 border-black/10 bg-black/5" />
                        ))}
                      </div>
                      <h3 className={cn(
                        "text-xl font-bold leading-tight mb-2 text-slate-900",
                        item.status === 'COMPLETED' ? 'line-through opacity-50' : ''
                      )}>
                        {item.title}
                      </h3>
                      {item.notes && (
                        <p className="text-sm text-slate-700 line-clamp-4 font-medium italic">
                          &ldquo;{item.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-black/5">
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[9px] border-black/20 uppercase px-1">
                          {item.type}
                        </Badge>
                      </div>
                      {item.dueDate && (
                        <span className="text-[10px] font-bold opacity-60 text-slate-900">
                          {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed rounded-3xl opacity-20">
            <p className="text-2xl font-black uppercase">Nothing here yet</p>
            <p className="font-mono text-sm">No items match your search</p>
          </div>
        )}
      </div>
    )
  }

  // Netflix Dashboard Layout for Media Lists
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <ItemDetailsDialog
        item={selectedItem}
        listId={list.id}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        isRadarrEnabled={isRadarrEnabled}
        isSonarrEnabled={isSonarrEnabled}
        canEdit={canEdit}
        isOwner={isOwner}
        tagConfigs={tagConfigsMap}
        allExistingTags={allTags}
        onStatusToggle={handleStatusToggle}
        onItemDelete={handleItemDelete}
      />
      {/* Sidebar */}
      <aside 
        className={cn(
          "shrink-0 lg:sticky lg:top-24 transition-all duration-300 ease-in-out pb-10",
          isSidebarCollapsed ? "w-full lg:w-16" : "w-full lg:w-64"
        )}
      >
        <div className="mb-6 flex items-start justify-between">
          <div className={cn(
            "transition-all duration-300",
            isSidebarCollapsed ? "lg:opacity-0 lg:w-0 overflow-hidden" : "lg:opacity-100 lg:w-auto"
          )}>
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-1 whitespace-nowrap">{list.title}</h1>
            <p className="text-xs text-muted-foreground font-mono uppercase font-bold tracking-widest whitespace-nowrap">
              {filteredItems.length} of {optimisticItems.length} items
            </p>
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground shrink-0 hidden lg:block"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>
        
        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 scrollbar-hide">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = activeCategory === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveCategory(item.id as FilterCategory)
                  setSearchQuery('') 
                  setSelectedTags([])
                  setSelectedColors([])
                }}
                className={cn(
                  "flex items-center rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground",
                  isSidebarCollapsed ? "lg:px-0 lg:justify-center h-12 w-12" : "px-4 py-3 h-auto"
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "animate-pulse" : "")} />
                <span className={cn(
                  "ml-3 transition-all duration-300",
                  isSidebarCollapsed && "lg:hidden"
                )}>
                  {item.label}
                </span>
                {!isSidebarCollapsed && isActive && <ChevronRight className="ml-auto h-4 w-4 hidden lg:block" />}
              </button>
            )
          })}
        </nav>

        {!isSidebarCollapsed && allTags.length > 0 && (
          <div className="mt-8 space-y-3 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Filter by Tag</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <TagBadge 
                  key={tag} 
                  name={tag} 
                  color={tagConfigsMap[tag]}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedTags.includes(tag) ? "ring-2 ring-primary ring-offset-1 scale-105 opacity-100" : "opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {!isSidebarCollapsed && allColors.length > 0 && (
          <div className="mt-8 space-y-3 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Filter by Color</h3>
            <div className="flex flex-wrap gap-2">
              {allColors.map(color => (
                <button
                  key={color}
                  onClick={() => toggleColor(color)}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-all",
                    selectedColors.includes(color) ? "border-primary ring-2 ring-primary/20 ring-offset-1 scale-110" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}

        <div className={cn(
          "pt-6 hidden lg:block transition-all",
          isSidebarCollapsed ? "lg:pt-4 lg:flex lg:justify-center" : ""
        )}>
          {canEdit && (
            <AddItemDialog 
              key={selectedDate ? `date-${selectedDate.getTime()}` : 'header'}
              listId={list.id} 
              initialDate={selectedDate} 
              onOpenChange={handleOpenChange}
              buttonVariant={isSidebarCollapsed ? "ghost" : "default"}
              buttonSize={isSidebarCollapsed ? "icon" : "default"}
              tagConfigs={tagConfigsMap}
              allExistingTags={allTags}
            />
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full min-w-0">
        {/* Search Bar */}
        <div className="mb-8 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeCategory === 'ALL' ? 'everything' : activeCategory.toLowerCase() + 's'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {filteredItems.map((item) => {
            const isGame = item.mediaType === 'GAME'
            const streaming = (!isGame && (item.media?.streamingInfo as unknown as StreamingInfo)) || {}
            const providers = streaming.flatrate || []
            const gameInfo = isGame ? (item.media?.streamingInfo as unknown as GameInfo) : null

            return (
              <Card key={item.id} 
                onClick={() => handleItemClick(item)}
                className={cn(
                "overflow-hidden transition-all hover:ring-2 hover:ring-primary/20 cursor-pointer",
                item.status === 'COMPLETED' ? "opacity-60 grayscale-[0.3]" : ""
              )}>
                <CardContent className="p-0 flex flex-col sm:flex-row h-full">
                  <div className="relative w-full sm:w-48 h-72 sm:h-auto flex-shrink-0 bg-muted">
                    {item.media?.posterPath ? (
                      <Image
                        src={item.media.posterPath}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 192px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        {item.mediaType === 'MOVIE' ? <Film className="h-12 w-12 opacity-20" /> :
                         item.mediaType === 'GAME' ? <Gamepad2 className="h-12 w-12 opacity-20" /> :
                         <Tv className="h-12 w-12 opacity-20" />}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h2 className={cn(
                            "text-2xl font-bold truncate",
                            item.status === 'COMPLETED' ? 'line-through' : ''
                          )}
                          style={{ color: item.color || undefined }}>
                            {item.title}
                          </h2>
                          {item.media?.rating && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-400/10 text-yellow-600 rounded text-sm font-bold">
                              <Star className="h-3 w-3 fill-current" />
                              {item.media.rating.toFixed(1)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {item.mediaType || 'TASK'}
                          </Badge>
                          {item.tags.map(tag => (
                            <TagBadge key={tag} name={tag} color={tagConfigsMap[tag]} />
                          ))}
                          {isGame && gameInfo?.esrb && (
                            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                              {gameInfo.esrb}
                            </Badge>
                          )}
                          {item.dueDate && (
                            <span className="text-xs text-muted-foreground font-medium italic">
                              Expected: {new Date(item.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ItemActions 
                          id={item.id} 
                          status={item.status} 
                          listId={list.id} 
                          mediaType={item.mediaType} 
                          isRadarrEnabled={isRadarrEnabled} 
                          isSonarrEnabled={isSonarrEnabled}
                          canEdit={canEdit}
                          isOwner={isOwner}
                          onStatusToggle={() => handleStatusToggle(item)}
                          onDelete={() => handleItemDelete(item.id)}
                        />
                      </div>
                    </div>

                    <p className="text-muted-foreground text-sm line-clamp-3 mb-3 flex-1 italic">
                      {item.notes || "No description provided."}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {item.status === 'COMPLETED' ? (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            {isGame ? 'Completed' : 'Finished'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {isGame ? 'Playing' : 'Currently Watching'}
                          </Badge>
                        )}
                      </div>

                      {!isGame && providers.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground hidden sm:inline">Stream on:</span>
                          <div className="flex -space-x-2">
                            {providers.slice(0, 3).map((provider: any) => (
                              <div key={provider.provider_id} className="relative h-8 w-8 rounded-full border-2 border-background overflow-hidden bg-muted shadow-sm" title={provider.provider_name}>
                                <Image
                                  src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                                  alt={provider.provider_name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed rounded-3xl opacity-20">
            <p className="text-2xl font-black uppercase">Nothing here yet</p>
            <p className="font-mono text-sm">No items match this category or filter</p>
          </div>
        )}
      </main>
    </div>
  )
}
