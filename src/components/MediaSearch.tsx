'use client'

import { useState, useEffect, useTransition } from 'react'
import { searchMediaAction } from '@/actions/media'
import { MediaSearchResult } from '@/lib/media-api'
import { Input } from '@/components/ui/input'
import { Search, Film, Tv, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import Image from 'next/image'

interface MediaSearchProps {
  onSelect: (result: MediaSearchResult) => void
}

export default function MediaSearch({ onSelect }: MediaSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MediaSearchResult[]>([])
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        startTransition(async () => {
          const searchResults = await searchMediaAction(query)
          setResults(searchResults)
          setIsOpen(true)
        })
      } else {
        setResults([])
        setIsOpen(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for a movie or show..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        {isPending && (
          <div className="absolute right-2.5 top-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto p-1 shadow-2xl">
          {results.map((result) => (
            <button
              key={`${result.mediaType}-${result.id}`}
              className="w-full flex items-start gap-3 p-2 hover:bg-muted rounded-sm transition-colors text-left"
              onClick={() => {
                onSelect(result)
                setIsOpen(false)
                setQuery('')
              }}
            >
              <div className="relative h-16 w-11 flex-shrink-0 bg-muted rounded overflow-hidden">
                {result.posterPath ? (
                  <Image
                    src={result.posterPath}
                    alt={result.title}
                    fill
                    className="object-cover"
                    sizes="44px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    {result.mediaType === 'movie' ? <Film className="h-4 w-4" /> : <Tv className="h-4 w-4" />}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{result.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="capitalize">{result.mediaType}</span>
                  {result.releaseDate && <span>• {new Date(result.releaseDate).getFullYear()}</span>}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {result.overview}
                </p>
              </div>
            </button>
          ))}
        </Card>
      )}
    </div>
  )
}
