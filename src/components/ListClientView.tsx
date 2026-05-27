'use client'

import { useState } from 'react'
import { Item, ListType, MediaMetadata } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import AddItemDialog from '@/components/AddItemDialog'
import ItemActions from '@/components/ItemActions'
import { Star, Film, Tv } from 'lucide-react'
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

interface ListClientViewProps {
  list: {
    id: string
    title: string
    type: ListType
  }
  items: ItemWithMedia[]
}

export default function ListClientView({ list, items }: ListClientViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

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
          </p>
        </div>
        <div className="flex gap-2">
          {/* We keep the header button too */}
          <AddItemDialog 
            key={selectedDate ? `date-${selectedDate.getTime()}` : 'header'}
            listId={list.id} 
            initialDate={selectedDate} 
            onOpenChange={handleOpenChange}
          />
        </div>
      </div>

      {isCalendarList ? (
        <CalendarView items={items} listId={list.id} onAddClick={handleAddClick} />
      ) : isMediaList ? (
        <div className="space-y-6 max-w-4xl mx-auto">
          {items.map((item) => {
            const streaming = (item.media?.streamingInfo as unknown as StreamingInfo) || {}
            const providers = streaming.flatrate || []

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
                        {item.mediaType === 'MOVIE' ? <Film className="h-12 w-12 opacity-20" /> : <Tv className="h-12 w-12 opacity-20" />}
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
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {item.mediaType || 'TASK'}
                          </Badge>
                          {item.dueDate && (
                            <span className="text-xs text-muted-foreground font-medium italic">
                              Expected: {new Date(item.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <ItemActions id={item.id} status={item.status} listId={list.id} />
                    </div>

                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1 italic">
                      {item.notes || "No description provided."}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {item.status === 'COMPLETED' ? (
                          <Badge className="bg-green-500 hover:bg-green-600">Finished</Badge>
                        ) : (
                          <Badge variant="secondary">Currently Watching</Badge>
                        )}
                      </div>
                      
                      {providers.length > 0 && (
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
                      )}
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
                      <ItemActions id={item.id} status={item.status} listId={list.id} />
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
