'use client'

import { useState, useEffect, useTransition } from 'react'
import { searchGamesAction } from '@/actions/media'
import type { GameSearchResult } from '@/lib/media-api'
import { Input } from '@/components/ui/input'
import { Search, Gamepad2, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import Image from 'next/image'

interface GameSearchProps {
  onSelect: (result: GameSearchResult) => void
}

export default function GameSearch({ onSelect }: GameSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GameSearchResult[]>([])
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        startTransition(async () => {
          const searchResults = await searchGamesAction(query)
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
          placeholder="Search for a game..."
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
              key={result.id}
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
                    <Gamepad2 className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{result.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Game</span>
                  {result.releaseDate && (
                    <span>• {new Date(result.releaseDate).getFullYear()}</span>
                  )}
                  {result.metacritic && (
                    <span className="font-semibold text-green-600">• MC {result.metacritic}</span>
                  )}
                </div>
                {result.overview && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {result.overview}
                  </p>
                )}
              </div>
            </button>
          ))}
        </Card>
      )}
    </div>
  )
}
