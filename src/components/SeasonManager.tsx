'use client'

import { useState, useEffect } from 'react'
import { getSeriesSeasonsAction, updateSeriesSeasonsAction } from '@/actions/servarr'
import { Loader2, Save, Eye, EyeOff, CheckCircle2, Trash2 } from 'lucide-react'
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
  isOwner,
  enabled,
}: {
  itemId: string
  isOwner: boolean
  enabled: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inLibrary, setInLibrary] = useState(false)
  const [seasons, setSeasons] = useState<SeasonInfo[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [deleteFiles, setDeleteFiles] = useState<number[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const res = await getSeriesSeasonsAction(itemId)
      setInLibrary(res.inLibrary)
      setSeasons(res.seasons)
      setSelected(res.seasons.filter((s: SeasonInfo) => s.monitored).map((s: SeasonInfo) => s.seasonNumber))
      setDeleteFiles([])
    } catch {
      // swallow — section just won't show
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    if (enabled) {
      getSeriesSeasonsAction(itemId)
        .then(res => {
          if (!active) return
          setInLibrary(res.inLibrary)
          setSeasons(res.seasons)
          setSelected(res.seasons.filter((s: SeasonInfo) => s.monitored).map((s: SeasonInfo) => s.seasonNumber))
        })
        .catch(() => {})
        .finally(() => active && setLoading(false))
    } else {
      setLoading(false)
    }
    return () => { active = false }
  }, [itemId, enabled])

  if (!enabled || loading) {
    return enabled ? (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking Sonarr…
      </div>
    ) : null
  }

  // Not downloaded to Sonarr yet — nothing to manage here
  if (!inLibrary) return null

  const originalMonitored = seasons.filter(s => s.monitored).map(s => s.seasonNumber).sort((a, b) => a - b)
  const changed =
    selected.slice().sort((a, b) => a - b).join(',') !== originalMonitored.join(',') ||
    deleteFiles.length > 0

  const toggle = (s: SeasonInfo) => {
    const isSelected = selected.includes(s.seasonNumber)
    if (isSelected) {
      // Un-monitoring this season
      setSelected(prev => prev.filter(n => n !== s.seasonNumber))
      // If it has downloaded files and the user owns the server, offer to delete them
      if (s.episodeFileCount > 0 && isOwner) {
        const del = confirm(
          `Season ${s.seasonNumber} has ${s.episodeFileCount} downloaded episode${s.episodeFileCount === 1 ? '' : 's'}.\n\n` +
          `OK  = stop monitoring AND delete the files from disk\n` +
          `Cancel = stop monitoring but keep the files`
        )
        setDeleteFiles(prev => del ? [...prev, s.seasonNumber] : prev.filter(n => n !== s.seasonNumber))
      }
    } else {
      // Re-monitoring cancels any pending deletion
      setSelected(prev => [...prev, s.seasonNumber])
      setDeleteFiles(prev => prev.filter(n => n !== s.seasonNumber))
    }
  }

  const save = async () => {
    setSaving(true)
    const res = await updateSeriesSeasonsAction(itemId, selected, deleteFiles)
    setSaving(false)
    if (res.success) {
      const deleted = deleteFiles.length
      toast.success(deleted > 0 ? `Seasons updated · files deleted for ${deleted} season(s)` : 'Seasons updated')
      await load()
    } else {
      toast.error(res.error)
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
          <button
            type="button"
            onClick={() => {
              // Un-monitoring everything: prompt once per season-with-files if owner
              setSelected([])
            }}
            className="text-primary hover:underline"
          >None</button>
        </div>
      </div>

      <div className="space-y-1.5">
        {seasons.map(s => {
          const isMonitored = selected.includes(s.seasonNumber)
          const willDelete = deleteFiles.includes(s.seasonNumber)
          const complete = s.totalEpisodeCount > 0 && s.episodeFileCount >= s.totalEpisodeCount
          return (
            <button
              key={s.seasonNumber}
              type="button"
              onClick={() => toggle(s)}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border-2 transition-all text-left',
                isMonitored
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-muted-foreground/15 bg-transparent hover:border-muted-foreground/30',
                willDelete && 'border-destructive/50 bg-destructive/5'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isMonitored ? (
                  <Eye className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                )}
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
                  {s.episodeFileCount}/{s.totalEpisodeCount || '?'}
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
              : 'Newly monitored seasons will be searched'}
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
