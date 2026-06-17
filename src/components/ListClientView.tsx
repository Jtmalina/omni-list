'use client'

import { useState, useEffect, useMemo, useOptimistic, useTransition, useRef } from 'react'
import { Item, ItemStatus, ListType, MediaMetadata, MediaType } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import AddItemDialog from '@/components/AddItemDialog'
import ItemActions from '@/components/ItemActions'
import { Star, Film, Tv, Gamepad2, LayoutGrid, MoreHorizontal, ChevronRight, PanelLeftClose, PanelLeftOpen, Search, X, LayoutList, Check, Plus, Loader2, Telescope } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import CalendarView from './CalendarView'
import { Input } from '@/components/ui/input'
import { TagBadge } from './TagBadge'
import ItemDetailsDialog from './ItemDetailsDialog'
import { updateItemStatus, deleteItem } from '@/actions/item'
import { renameList } from '@/actions/list'
import { useRealtimeSync } from '@/lib/hooks/useRealtimeSync'
import { useRouter } from 'next/navigation'
import type { MediaSearchResult, GameSearchResult } from '@/lib/media-api'
import { searchMediaAction, searchGamesAction } from '@/actions/media'
import DiscoverCard from './DiscoverCard'
import { useTrending, useUpcoming, useRecommendations, refreshLibrary } from '@/lib/hooks/useAppData'

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
  link?: string // JustWatch "where to watch" deep link from TMDB
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

type FilterCategory = 'ALL' | 'MOVIE' | 'SHOW' | 'GAME' | 'OTHER' | 'DISCOVER'

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

  // Cache the list type so loading.tsx can show the right skeleton next visit
  useEffect(() => {
    localStorage.setItem(`omnilist_type_${list.id}`, list.type)
  }, [list.id, list.type])

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
  const [openItemInEditMode, setOpenItemInEditMode] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState(list.title)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')

  // Discover tab
  const [discoverMode, setDiscoverMode] = useState<'media' | 'game'>('media')
  const [discoverQuery, setDiscoverQuery] = useState('')
  const [discoverResults, setDiscoverResults] = useState<(MediaSearchResult | GameSearchResult)[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [quickAddMedia, setQuickAddMedia] = useState<MediaSearchResult | null>(null)
  const [quickAddGame, setQuickAddGame] = useState<GameSearchResult | null>(null)
  // Discover feed — cached via SWR, fetched only while the Discover tab is open
  const isDiscoverActive = activeCategory === 'DISCOVER'
  const { data: trending = [], isLoading: trendingLoading } = useTrending(isDiscoverActive)
  const { data: upcoming = [], isLoading: upcomingLoading } = useUpcoming(isDiscoverActive)
  const { data: recommendations = [], isLoading: recommendationsLoading } = useRecommendations(isDiscoverActive)
  const recsLoading = trendingLoading || upcomingLoading || recommendationsLoading
  const discoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    { id: 'DISCOVER', label: 'Discover', icon: Telescope },
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
      refreshLibrary() // completion status feeds recommendation seeds
    })
  }

  const handleItemDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      startTransition(async () => {
        addOptimisticAction({ type: 'DELETE', id })
        await deleteItem(id, list.id)
        refreshLibrary()
      })
    }
  }

  const handleItemClick = (item: ItemWithMedia) => {
    if (list.type === 'MEDIA' && item.media?.externalId) {
      const type = item.mediaType === 'MOVIE' ? 'movie' : item.mediaType === 'SHOW' ? 'tv' : 'game'
      router.push(`/media/${type}/${item.media.externalId}`)
    } else {
      setOpenItemInEditMode(false)
      setSelectedItem(item)
    }
  }

  const handleItemEdit = (item: ItemWithMedia) => {
    setOpenItemInEditMode(true)
    setSelectedItem(item)
  }

  const handleDiscoverSearch = (query: string, mode: 'media' | 'game') => {
    setDiscoverQuery(query)
    setDiscoverResults([])
    if (discoverTimer.current) clearTimeout(discoverTimer.current)
    if (!query.trim()) return
    discoverTimer.current = setTimeout(async () => {
      setDiscoverLoading(true)
      try {
        const results = mode === 'media'
          ? await searchMediaAction(query)
          : await searchGamesAction(query)
        setDiscoverResults(results.slice(0, 20))
      } catch {}
      finally { setDiscoverLoading(false) }
    }, 350)
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
          onClose={() => { setSelectedItem(null); setOpenItemInEditMode(false) }}
          isRadarrEnabled={isRadarrEnabled}
          isSonarrEnabled={isSonarrEnabled}
          canEdit={canEdit}
          isOwner={isOwner}
          tagConfigs={tagConfigsMap}
          allExistingTags={allTags}
          onStatusToggle={handleStatusToggle}
          onItemDelete={handleItemDelete}
          startInEditMode={openItemInEditMode}
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
          onClose={() => { setSelectedItem(null); setOpenItemInEditMode(false) }}
          isRadarrEnabled={isRadarrEnabled}
          isSonarrEnabled={isSonarrEnabled}
          canEdit={canEdit}
          isOwner={isOwner}
          tagConfigs={tagConfigsMap}
          allExistingTags={allTags}
          onStatusToggle={handleStatusToggle}
          onItemDelete={handleItemDelete}
          startInEditMode={openItemInEditMode}
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
                        onEdit={() => handleItemEdit(item)}
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
                      {(item.description || item.notes) && (
                        <p className="text-sm text-slate-700 line-clamp-4 font-medium italic">
                          &ldquo;{item.description || item.notes}&rdquo;
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
        onClose={() => { setSelectedItem(null); setOpenItemInEditMode(false) }}
        isRadarrEnabled={isRadarrEnabled}
        isSonarrEnabled={isSonarrEnabled}
        canEdit={canEdit}
        isOwner={isOwner}
        tagConfigs={tagConfigsMap}
        allExistingTags={allTags}
        onStatusToggle={handleStatusToggle}
        onItemDelete={handleItemDelete}
        startInEditMode={openItemInEditMode}
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
            {isEditingTitle ? (
              <input
                autoFocus
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onBlur={async () => {
                  setIsEditingTitle(false)
                  const trimmed = editTitleValue.trim()
                  if (trimmed && trimmed !== list.title) { await renameList(list.id, trimmed); refreshLibrary() }
                  else setEditTitleValue(list.title)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') { setEditTitleValue(list.title); setIsEditingTitle(false) }
                }}
                className="text-3xl font-black uppercase tracking-tighter mb-1 bg-transparent border-b-2 border-primary outline-none w-full"
              />
            ) : (
              <h1
                className={cn(
                  "text-3xl font-black uppercase tracking-tighter mb-1 whitespace-nowrap",
                  isOwner && "cursor-pointer hover:opacity-70 transition-opacity"
                )}
                onClick={() => isOwner && setIsEditingTitle(true)}
                title={isOwner ? "Click to rename" : undefined}
              >{list.title}</h1>
            )}
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
          {canEdit && activeCategory !== 'DISCOVER' && (
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

        {/* Hidden AddItemDialog triggered by Discover quick-add */}
        <AddItemDialog
          key={quickAddMedia?.id ?? quickAddGame?.id ?? 'discover-add'}
          listId={list.id}
          showTrigger={false}
          isManualOpen={!!(quickAddMedia || quickAddGame)}
          preselectedMedia={quickAddMedia ?? undefined}
          preselectedGame={quickAddGame ?? undefined}
          tagConfigs={tagConfigsMap}
          allExistingTags={allTags}
          onClose={() => { setQuickAddMedia(null); setQuickAddGame(null) }}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full min-w-0">
        {/* Search Bar + Layout Toggle */}
        {activeCategory !== 'DISCOVER' && <div className="mb-8 flex items-center gap-3">
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
          {/* Layout toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={cn(
                'p-2 rounded-lg transition-all',
                viewMode === 'grid' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={cn(
                'p-2 rounded-lg transition-all',
                viewMode === 'list' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>}

        {/* ── Discover tab ─────────────────────────────────────────────── */}
        {activeCategory === 'DISCOVER' && (
          <div className="space-y-6">
            {/* Mode toggle + search */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1 p-1 bg-muted/40 rounded-xl shrink-0">
                <button
                  onClick={() => { setDiscoverMode('media'); setDiscoverQuery(''); setDiscoverResults([]) }}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all',
                    discoverMode === 'media' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                  <Film className="h-4 w-4" /> Movie / TV
                </button>
                <button
                  onClick={() => { setDiscoverMode('game'); setDiscoverQuery(''); setDiscoverResults([]) }}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all',
                    discoverMode === 'game' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                  <Gamepad2 className="h-4 w-4" /> Games
                </button>
              </div>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={discoverMode === 'media' ? 'Search movies & TV shows…' : 'Search games…'}
                  value={discoverQuery}
                  onChange={(e) => handleDiscoverSearch(e.target.value, discoverMode)}
                  className="pl-10 pr-10 h-11 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
                  autoFocus
                />
                {discoverLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {discoverQuery && !discoverLoading && (
                  <button onClick={() => { setDiscoverQuery(''); setDiscoverResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* When not searching: Discover feed (trending, upcoming, recommendations) */}
            {!discoverQuery && (
              recsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mb-3" />
                  <p className="font-mono text-sm">Loading discover feed…</p>
                </div>
              ) : (trending.length + upcoming.length + recommendations.length) > 0 ? (
                <div className="space-y-10">
                  {[
                    { key: 'trending', title: 'Trending This Week', subtitle: 'Popular right now', items: trending },
                    { key: 'upcoming', title: 'Coming Soon', subtitle: 'Upcoming & now playing', items: upcoming },
                    { key: 'recs', title: 'Recommended For You', subtitle: "Based on what's in your library", items: recommendations },
                  ].filter(sec => sec.items.length > 0).map(sec => (
                    <div key={sec.key} className="space-y-4">
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-tight">{sec.title}</h3>
                        <p className="text-xs text-muted-foreground font-mono">{sec.subtitle}</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                        {sec.items.map((r) => (
                          <DiscoverCard
                            key={`${(r as any).mediaType}-${r.id}`}
                            result={r}
                            canEdit={canEdit}
                            onAdd={() => (r as any).mediaType === 'game' ? setQuickAddGame(r as GameSearchResult) : setQuickAddMedia(r as MediaSearchResult)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <Telescope className="h-12 w-12 mb-3" />
                  <p className="text-2xl font-black uppercase">Discover</p>
                  <p className="font-mono text-sm">Search for something to add</p>
                </div>
              )
            )}

            {/* Results grid — same poster style as the main list */}
            {discoverResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {discoverResults.map((result) => {
                  const r = result as any
                  const isGame = discoverMode === 'game'
                  const year = r.releaseDate ? new Date(r.releaseDate).getFullYear() : null
                  const rating = isGame ? r.rating : r.voteAverage
                  return (
                    <div
                      key={r.id}
                      className="group relative cursor-default rounded-xl overflow-hidden border-2 border-transparent hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
                    >
                      {/* Poster */}
                      <div className="relative aspect-[2/3] bg-muted">
                        {r.posterPath ? (
                          <Image
                            src={r.posterPath}
                            alt={r.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {isGame ? <Gamepad2 className="h-10 w-10 opacity-20" /> : <Film className="h-10 w-10 opacity-20" />}
                          </div>
                        )}

                        {/* Hover overlay — description + rating */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 gap-1">
                          <p className="text-white text-[11px] leading-relaxed line-clamp-4 italic">
                            {r.overview || ''}
                          </p>
                          {rating > 0 && (
                            <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                              <Star className="h-3 w-3 fill-current" />
                              {rating.toFixed(1)}
                            </div>
                          )}
                        </div>

                        {/* Quick-add button — centre of poster on hover */}
                        {canEdit && (
                          <button
                            onClick={() => isGame ? setQuickAddGame(result as GameSearchResult) : setQuickAddMedia(result as MediaSearchResult)}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            title={`Add ${r.title}`}
                          >
                            <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl">
                              <Plus className="h-6 w-6" />
                            </div>
                          </button>
                        )}
                      </div>

                      {/* Title + meta */}
                      <div className="p-2 space-y-0.5">
                        <p className="text-xs font-bold leading-tight line-clamp-2">{r.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {year ?? '—'}
                          {!isGame && r.mediaType ? ` · ${r.mediaType}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Grid view */}
        {activeCategory !== 'DISCOVER' && viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {filteredItems.map((item) => {
              const isGame = item.mediaType === 'GAME'
              const streaming = (!isGame && (item.media?.streamingInfo as unknown as StreamingInfo)) || {}
              const providers = (streaming.flatrate || []).slice(0, 3)
              const gameInfo = isGame ? (item.media?.streamingInfo as unknown as GameInfo) : null

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'group relative cursor-pointer rounded-xl overflow-hidden border-2 border-transparent',
                    'hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-200',
                    item.status === 'COMPLETED' ? 'opacity-50 grayscale-[0.4]' : ''
                  )}
                >
                  {/* Poster */}
                  <div className="relative aspect-[2/3] bg-muted">
                    {item.media?.posterPath ? (
                      <Image
                        src={item.media.posterPath}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {item.mediaType === 'MOVIE' ? <Film className="h-10 w-10 opacity-20" /> :
                         item.mediaType === 'GAME' ? <Gamepad2 className="h-10 w-10 opacity-20" /> :
                         <Tv className="h-10 w-10 opacity-20" />}
                      </div>
                    )}

                    {/* Hover overlay with description */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 gap-1">
                      <p className="text-white text-[11px] leading-relaxed line-clamp-4 italic">
                        {item.description || item.notes || ''}
                      </p>
                      {item.media?.rating && (
                        <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                          <Star className="h-3 w-3 fill-current" />
                          {item.media.rating.toFixed(1)}
                        </div>
                      )}
                    </div>

                    {/* Status badge — top left */}
                    {item.status === 'COMPLETED' && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-green-500 text-[9px] px-1.5 py-0.5 shadow">
                          {isGame ? 'Done' : 'Watched'}
                        </Badge>
                      </div>
                    )}

                    {/* Circular done checkbox — top right */}
                    {canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusToggle(item) }}
                        title={item.status === 'COMPLETED' ? 'Mark as not done' : 'Mark as done'}
                        className={cn(
                          'absolute top-2 right-2 z-10 h-7 w-7 rounded-full border-2 flex items-center justify-center shadow-md transition-all',
                          item.status === 'COMPLETED'
                            ? 'bg-green-500 border-green-400 text-white'
                            : 'bg-white/80 border-white/60 text-transparent hover:text-green-500 hover:border-green-400'
                        )}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </button>
                    )}

                    {/* Streaming logos — bottom left (click to open "where to watch") */}
                    {providers.length > 0 && (
                      <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                        {providers.map((provider: any) => {
                          const logo = (
                            <Image
                              src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                              alt={provider.provider_name}
                              fill
                              className="object-cover"
                            />
                          )
                          return streaming.link ? (
                            <a
                              key={provider.provider_id}
                              href={streaming.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={`Watch ${item.title} on ${provider.provider_name}`}
                              className="relative h-6 w-6 rounded-md overflow-hidden border border-white/20 shadow-md hover:scale-110 transition-transform"
                            >
                              {logo}
                            </a>
                          ) : (
                            <div
                              key={provider.provider_id}
                              className="relative h-6 w-6 rounded-md overflow-hidden border border-white/20 shadow-md"
                              title={provider.provider_name}
                            >
                              {logo}
                            </div>
                          )
                        })}
                      </div>
                    )}

                  </div>

                  {/* Title + meta below poster */}
                  <div className="p-2 space-y-1">
                    <p
                      className={cn(
                        'text-xs font-bold leading-tight line-clamp-2',
                        item.status === 'COMPLETED' ? 'line-through opacity-60' : ''
                      )}
                      style={{ color: item.color || undefined }}
                    >
                      {item.title}
                    </p>
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
                        hideCheckbox
                        onStatusToggle={() => handleStatusToggle(item)}
                        onDelete={() => handleItemDelete(item.id)}
                        onEdit={() => handleItemEdit(item)}
                      />
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase border-muted-foreground/20">
                        {item.mediaType || 'TASK'}
                      </Badge>
                      {item.tags.slice(0, 2).map(tag => (
                        <TagBadge key={tag} name={tag} color={tagConfigsMap[tag]} className="text-[9px] px-1 py-0" />
                      ))}
                      {isGame && gameInfo?.esrb && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                          {gameInfo.esrb}
                        </Badge>
                      )}
                    </div>
                    {item.dueDate && (
                      <p className="text-[10px] text-muted-foreground italic truncate">
                        {new Date(item.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* List view (original) */}
        {activeCategory !== 'DISCOVER' && viewMode === 'list' && (
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
                            onEdit={() => handleItemEdit(item)}
                          />
                        </div>
                      </div>

                      <p className="text-muted-foreground text-sm line-clamp-3 mb-3 flex-1 italic">
                        {item.description || item.notes || "No description provided."}
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
                              {providers.slice(0, 3).map((provider: any) => {
                                const logo = (
                                  <Image
                                    src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                                    alt={provider.provider_name}
                                    fill
                                    className="object-cover"
                                  />
                                )
                                return streaming.link ? (
                                  <a
                                    key={provider.provider_id}
                                    href={streaming.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title={`Watch ${item.title} on ${provider.provider_name}`}
                                    className="relative h-8 w-8 rounded-full border-2 border-background overflow-hidden bg-muted shadow-sm hover:scale-110 hover:z-10 transition-transform"
                                  >
                                    {logo}
                                  </a>
                                ) : (
                                  <div key={provider.provider_id} className="relative h-8 w-8 rounded-full border-2 border-background overflow-hidden bg-muted shadow-sm" title={provider.provider_name}>
                                    {logo}
                                  </div>
                                )
                              })}
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
        )}

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed rounded-3xl opacity-20">
            <p className="text-2xl font-black uppercase">Nothing here yet</p>
            <p className="font-mono text-sm">No items match your search</p>
          </div>
        )}
      </main>
    </div>
  )
}
