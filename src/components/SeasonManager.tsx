'use client'

import { useState, useEffect } from 'react'
import { getSeriesSeasonsAction, updateSeriesSeasonsAction, saveSeasonPreferenceAction } from '@/actions/servarr'
import { fetchTVSeasonsAction } from '@/actions/media'
import { Loader2, Save, Check, CheckCircle2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface SeasonInfo {
  seasonNumber: number
  monitored: boolean
  episodeFileCount: number
  totalEpisodeCount: number
}

export default function SeasonManager({
  itemId,
  tmdbId,
  storedSeasons,
  isOwner,
  enabled,
}: {
  itemId: string
  tmdbId?: string | null
  storedSeasons?: number[]
  isOwner: boolean
  enabled: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inLibrary, setInLibrary] = useState(false)
  const [seasons, setSeasons] = useState<SeasonInfo[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [deleteFiles, setDeleteFiles] = useState<number[]>([])

  const hydrate = async () => {
    // Prefer Sonarr's live data; fall back to TMDB's season list if the show
    // isn't added yet OR if Sonarr is unreachable/erroring (e.g. 401). The
    // TMDB fallback must always run so the picker works regardless.
    let sonarr: { inLibrary: boolean; serverId: number | null; seasons: SeasonInfo[] } = {
      inLibrary: false, serverId: null, seasons: [],
    }
    try {
      sonarr = await getSeriesSeasonsAction(itemId)
    } catch {
      // Sonarr down/erroring — fall through to TMDB
    }
    if (sonarr.inLibrary && sonarr.seasons.length > 0) {
      setInLibrary(true)
      setSeasons(sonarr.seasons)
      setSelected(sonarr.seasons.filter((s: SeasonInfo) => s.monitored).map((s: SeasonInfo) => s.seasonNumber))
      setDeleteFiles([])
      return
    }
    // Not in Sonarr yet — build the list from TMDB and seed from stored preference
    if (tmdbId) {
      const tmdb = await fetchTVSeasonsAction(tmdbId)
      const synthesized: SeasonInfo[] = tmdb.map(s => ({
        seasonNumber: s.seasonNumber,
        monitored: storedSeasons ? storedSeasons.includes(s.seasonNumber) : true,
        episodeFileCount: 0,
        totalEpisodeCount: s.episodeCount,
      }))
      setInLibrary(false)
      setSeasons(synthesized)
      setSelected(storedSeasons ?? synthesized.map(s => s.seasonNumber))
      setDeleteFiles([])
    }
  }

  useEffect(() => {
    let active = true
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    hydrate()
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, enabled])

  if (!enabled) return null
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking Sonarr…
      </div>
    )
  }
  if (seasons.length === 0) return null

  const originalMonitored = seasons.filter(s => s.monitored).map(s => s.seasonNumber).sort((a, b) => a - b)
  const changed =
    selected.slice().sort((a, b) => a - b).join(',') !== originalMonitored.join(',') ||
    deleteFiles.length > 0

  const toggle = (s: SeasonInfo) => {
    const isSelected = selected.includes(s.seasonNumber)
    if (isSelected) {
      setSelected(prev => prev.filter(n => n !== s.seasonNumber))
      // Only in-library seasons with files can have their files deleted (owner only)
      if (inLibrary && s.episodeFileCount > 0 && isOwner) {
        const del = confirm(
          `Season ${s.seasonNumber} has ${s.episodeFileCount} downloaded episode${s.episodeFileCount === 1 ? '' : 's'}.\n\n` +
          `OK  = stop monitoring AND delete the files from disk\n` +
          `Cancel = stop monitoring but keep the files`
        )
        setDeleteFiles(prev => del ? [...prev, s.seasonNumber] : prev.filter(n => n !== s.seasonNumber))
      }
    } else {
      setSelected(prev => [...prev, s.seasonNumber])
      setDeleteFiles(prev => prev.filter(n => n !== s.seasonNumber))
    }
  }

  const save = async () => {
    setSaving(true)
    const res = inLibrary
      ? await updateSeriesSeasonsAction(itemId, selected, deleteFiles)
      : await saveSeasonPreferenceAction(itemId, selected)
    setSaving(false)
    if (res.success) {
      if (inLibrary) {
        const deleted = deleteFiles.length
        toast.success(deleted > 0 ? `Seasons updated · files deleted for ${deleted} season(s)` : 'Seasons updated')
        setLoading(true)
        await hydrate().catch(() => {})
        setLoading(false)
      } else {
        toast.success('Season preferences saved')
        // Reflect the new "monitored" baseline locally
        setSeasons(prev => prev.map(s => ({ ...s, monitored: selected.includes(s.seasonNumber) })))
      }
    } else {
      toast.error((res as { error?: string }).error || 'Failed to save seasons')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground opacity-50">
          Seasons
        </Label>
        <div className="flex gap-2 text-xs">
          <button type="button" onClick={() => setSelected(seasons.map(s => s.seasonNumber))} className="text-primary hover:underline">All</button>
          <span className="text-muted-foreground">·</span>
          <button type="button" onClick={() => setSelected([])} className="text-primary hover:underline">None</button>
        </div>
      </div>

      {!inLibrary && (
        <p className="text-[10px] text-muted-foreground italic">
          Not in Sonarr yet — pick which seasons to grab when you download.
        </p>
      )}

      <div className="space-y-1.5">
        {seasons.map(s => {
          const isSelected = selected.includes(s.seasonNumber)
          const willDelete = deleteFiles.includes(s.seasonNumber)
          const complete = inLibrary && s.totalEpisodeCount > 0 && s.episodeFileCount >= s.totalEpisodeCount
          return (
            <button
              key={s.seasonNumber}
              type="button"
              onClick={() => toggle(s)}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border-2 transition-all text-left',
                isSelected
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-muted-foreground/15 bg-transparent hover:border-muted-foreground/30',
                willDelete && 'border-destructive/50 bg-destructive/5'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Explicit checkbox pill */}
                <span className={cn(
                  'h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                  isSelected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/30'
                )}>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="font-bold text-sm">Season {s.seasonNumber}</span>
                {complete && !willDelete && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {willDelete && (
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase text-destructive">
                    <Trash2 className="h-3 w-3" /> Delete files
                  </span>
                )}
                <span className={cn(
                  'text-[11px] font-mono font-bold tabular-nums',
                  complete ? 'text-green-600' : 'text-muted-foreground'
                )}>
                  {inLibrary ? `${s.episodeFileCount}/${s.totalEpisodeCount || '?'}` : `${s.totalEpisodeCount || '?'}ep`}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {changed && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-[10px] text-muted-foreground italic">
            {deleteFiles.length > 0
              ? `${deleteFiles.length} season(s) will have files deleted`
              : inLibrary
                ? 'Newly monitored seasons will be searched'
                : 'Saved for when you download'}
          </p>
          <Button size="sm" onClick={save} disabled={saving} className="h-8">
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            Save Seasons
          </Button>
        </div>
      )}
    </div>
  )
}
