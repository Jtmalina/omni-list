'use client'

import Image from 'next/image'
import { Star, Film, Gamepad2, Plus } from 'lucide-react'
import type { MediaSearchResult, GameSearchResult } from '@/lib/media-api'

export default function DiscoverCard({
  result,
  canEdit,
  onAdd,
}: {
  result: MediaSearchResult | GameSearchResult
  canEdit: boolean
  onAdd: () => void
}) {
  const r = result as any
  const isGame = r.mediaType === 'game'
  const year = r.releaseDate ? new Date(r.releaseDate).getFullYear() : null
  const rating = isGame ? r.rating : r.voteAverage

  return (
    <div className="group relative cursor-default rounded-xl overflow-hidden border-2 border-transparent hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
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
          <p className="text-white text-[11px] leading-relaxed line-clamp-4 italic">{r.overview || ''}</p>
          {rating > 0 && (
            <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
              <Star className="h-3 w-3 fill-current" />
              {rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Quick-add */}
        {canEdit && (
          <button
            onClick={onAdd}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            title={`Add ${r.title}`}
          >
            <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl">
              <Plus className="h-6 w-6" />
            </div>
          </button>
        )}

        {/* Type tag — top left */}
        <div className="absolute top-2 left-2">
          <span className="px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-black uppercase tracking-wide">
            {isGame ? 'Game' : r.mediaType === 'tv' ? 'TV' : 'Movie'}
          </span>
        </div>
      </div>

      <div className="p-2 space-y-0.5">
        <p className="text-xs font-bold leading-tight line-clamp-2">{r.title}</p>
        <p className="text-[10px] text-muted-foreground">{year ?? '—'}</p>
      </div>
    </div>
  )
}
