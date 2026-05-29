'use client'

import { useState, useEffect, useTransition } from 'react'
import { searchGamesAction } from '@/actions/media'
import type { GameSearchResult } from '@/lib/media-api'
import { Input } from '@/components/ui/input'
import { Search, Gamepad2, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import Image from 'next/image'

function abbrevPlatform(name: string): string {
  const map: Record<string, string> = {
    'PC': 'PC',
    'PlayStation 5': 'PS5',
    'PlayStation 4': 'PS4',
    'PlayStation 3': 'PS3',
    'PlayStation 2': 'PS2',
    'Xbox Series X': 'Xbox S/X',
    'Xbox One': 'Xbox One',
    'Xbox 360': 'Xbox 360',
    'Nintendo Switch': 'Switch',
    'Nintendo DS': 'DS',
    'Nintendo 3DS': '3DS',
    'Wii U': 'Wii U',
    'Wii': 'Wii',
    'iOS': 'iOS',
    'Android': 'Android',
    'macOS': 'macOS',
    'Linux': 'Linux',
  }
  return map[name] ?? name
}

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
          {results.map((result) => {
            const platformLabels = result.platforms.slice(0, 4).map(abbrevPlatform)
            const overflow = result.platforms.length - 4

            return (
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
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    {result.releaseDate && (
                      <span>{new Date(result.releaseDate).getFullYear()}</span>
                    )}
                    {result.esrb && (
                      <span className="px-1 border rounded text-[10px] uppercase font-semibold">
                        {result.esrb}
                      </span>
                    )}
                    {result.metacritic && (
                      <span className="font-semibold text-green-600">MC {result.metacritic}</span>
                    )}
                  </div>
                  {platformLabels.length > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {platformLabels.join(' · ')}
                      {overflow > 0 && ` +${overflow}`}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </Card>
      )}
    </div>
  )
}
