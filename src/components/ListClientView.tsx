'use client'

import { useState } from 'react'
import { Item, ListType, MediaMetadata } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import AddItemDialog from '@/components/AddItemDialog'
import ItemActions from '@/components/ItemActions'
import { Star, Film, Tv, Gamepad2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import CalendarView from './CalendarView'

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

export default function ListClientView({ 
  list, 
  items, 
  servarrConfig,
  isOwner = false,
  accessLevel = null
}: ListClientViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const isRadarrEnabled = !!(servarrConfig?.radarrUrl && servarrConfig?.radarrApiKey)
  const isSonarrEnabled = !!(servarrConfig?.sonarrUrl && servarrConfig?.sonarrApiKey)

  const canEdit = isOwner || accessLevel === 'EDIT'

  const isMediaList = list.type === 'MEDIA'
  const isCalendarList = list.type === 'CALENDAR'

  const postItColors = [
    'bg-yellow-100 border-yellow-200 text-yellow-900',
    'bg-blue-100 border-blue-200 text-blue-900',
    'bg-green-100 border-green-200 text-green-900',
    'bg-pink-100 border-pink-200 text-pink-900',
    'bg-purple-100 border-purple-200 text-purple-900',
  ]

  const handleAddClick = (date: Date) => {
    if (!canEdit) return
    setSelectedDate(new Date(date)) // New object to trigger useEffect in dialog
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedDate(undefined)
    }
  }

  return (
    <>
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">{list.title}</h1>
          <p className="text-muted-foreground font-mono">
            {items.length} {isMediaList ? 'titles' : 'notes'} tracking
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
            />
          )}
        </div>
      </div>

      {isCalendarList ? (
        <CalendarView 
          items={items} 
          listId={list.id} 
          onAddClick={handleAddClick}
          isRadarrEnabled={isRadarrEnabled}
          isSonarrEnabled={isSonarrEnabled}
          canEdit={canEdit}
        />
      ) : isMediaList ? (
        <div className="space-y-6 max-w-4xl mx-auto">
          {items.map((item) => {
            const isGame = item.mediaType === 'GAME'
            const streaming = (!isGame && (item.media?.streamingInfo as unknown as StreamingInfo)) || {}
            const providers = streaming.flatrate || []
            const gameInfo = isGame ? (item.media?.streamingInfo as unknown as GameInfo) : null

            return (
              <Card key={item.id} className={cn(
                "overflow-hidden transition-all hover:ring-2 hover:ring-primary/20",
                item.status === 'COMPLETED' ? 'opacity-60 grayscale-[0.3]' : ''
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
                          )}>
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
                      <ItemActions 
                        id={item.id} 
                        status={item.status} 
                        listId={list.id} 
                        mediaType={item.mediaType} 
                        isRadarrEnabled={isRadarrEnabled}
                        isSonarrEnabled={isSonarrEnabled}
                        canEdit={canEdit}
                      />
                    </div>

                    <p className="text-muted-foreground text-sm line-clamp-3 mb-3 flex-1 italic">
                      {item.notes || "No description provided."}
                    </p>

                    {isGame && (gameInfo?.platforms?.length || gameInfo?.stores?.length) ? (
                      <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                        {gameInfo.platforms && gameInfo.platforms.length > 0 && (
                          <div className="flex items-start gap-1.5 flex-wrap">
                            <span className="font-semibold uppercase text-[10px] shrink-0 mt-0.5">Platforms:</span>
                            <span className="truncate">{gameInfo.platforms.join(' · ')}</span>
                          </div>
                        )}
                        {gameInfo.stores && gameInfo.stores.length > 0 && (
                          <div className="flex items-start gap-1.5 flex-wrap">
                            <span className="font-semibold uppercase text-[10px] shrink-0 mt-0.5">Buy on:</span>
                            <span>{gameInfo.stores.join(' · ')}</span>
                          </div>
                        )}
                      </div>
                    ) : null}

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

                      {isGame ? (
                        gameInfo?.metacritic != null && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground hidden sm:inline">Metacritic</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-sm font-bold",
                              gameInfo.metacritic >= 80 ? "bg-green-500/10 text-green-600" :
                              gameInfo.metacritic >= 60 ? "bg-yellow-500/10 text-yellow-600" :
                              "bg-red-500/10 text-red-600"
                            )}>
                              {gameInfo.metacritic}
                            </span>
                          </div>
                        )
                      ) : providers.length > 0 ? (
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
                            {providers.length > 3 && (
                              <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                                +{providers.length - 3}
                              </div>
                            )}
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {items.map((item, index) => {
            const colorClass = postItColors[index % postItColors.length]
            const rotationClass = index % 2 === 0 ? 'rotate-1' : '-rotate-1'
            
            return (
              <div 
                key={item.id} 
                className={cn(
                  "transition-transform hover:rotate-0 hover:scale-105 duration-200",
                  rotationClass
                )}
              >
                <Card className={cn(
                  "h-64 shadow-xl border-t-8 flex flex-col relative",
                  colorClass,
                  item.status === 'COMPLETED' ? 'opacity-40 grayscale-[0.5]' : ''
                )}>
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      <ItemActions 
                        id={item.id} 
                        status={item.status} 
                        listId={list.id} 
                        mediaType={item.mediaType} 
                        isRadarrEnabled={isRadarrEnabled}
                        isSonarrEnabled={isSonarrEnabled}
                        canEdit={canEdit}
                      />
                    </div>

                    <div className="mt-4 flex-1 overflow-hidden">
                      <h3 className={cn(
                        "text-xl font-bold leading-tight mb-2",
                        item.status === 'COMPLETED' ? 'line-through' : ''
                      )}>
                        {item.title}
                      </h3>
                      {item.notes && (
                        <p className="text-sm opacity-80 line-clamp-4 font-medium italic">
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
                        <span className="text-[10px] font-bold opacity-60">
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
      )}

      {items.length === 0 && !isCalendarList && (
        <div className="col-span-full flex flex-col items-center justify-center py-20 border-4 border-dashed rounded-3xl opacity-20">
          <p className="text-2xl font-black uppercase">Your board is empty</p>
          <p className="font-mono">Add your first {isMediaList ? 'media item' : 'note'} to get started</p>
        </div>
      )}
    </>
  )
}
