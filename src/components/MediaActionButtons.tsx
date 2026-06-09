'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import AddItemDialog from './AddItemDialog'
import ItemDetailsDialog from './ItemDetailsDialog'
import { findItemByExternalId } from '@/actions/item'
import { getLists } from '@/actions/list'
import { toast } from 'sonner'

export default function MediaActionButtons({ 
  externalId, 
  type, 
  title, 
  overview, 
  posterPath, 
  releaseDate,
  rating
}: { 
  externalId: string
  type: 'movie' | 'tv' | 'game'
  title: string
  overview: string
  posterPath: string | null
  releaseDate: string
  rating: number
}) {
  const [isPending, startTransition] = useTransition()
  const [existingItem, setExistingItem] = useState<any>(null)
  const [lists, setLists] = useState<any[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [externalId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [item, userLists] = await Promise.all([
        findItemByExternalId(externalId),
        getLists().catch(() => []) // Catch Unauthorized or other errors gracefully
      ])
      setExistingItem(item)
      setLists(userLists)
    } catch (error) {
      // If unauthorized, we just show nothing or a sign-in prompt (here we'll just show no buttons)
      console.error("Failed to load media actions:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <SkeletonButtons />
  }

  // If no lists returned and no existing item, user is likely logged out
  if (lists.length === 0 && !existingItem) {
    return null
  }

  const mediaData = {
    id: externalId,
    title,
    overview,
    posterPath,
    releaseDate,
    mediaType: type === 'tv' ? 'tv' : type as any,
    voteAverage: rating,
    rating: rating
  }

  const labelType = type === 'movie' ? 'Movie' : type === 'tv' ? 'TV Show' : 'Game'

  return (
    <div className="flex flex-wrap gap-3">
      {existingItem ? (
        <Button 
          onClick={() => setIsEditOpen(true)}
          className="rounded-2xl font-black uppercase text-xs gap-2 px-8 h-12 shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Edit2 className="h-4 w-4" />
          Edit {labelType} in {existingItem.list.title}
        </Button>
      ) : (
        <Button 
          onClick={() => setIsAddOpen(true)}
          className="rounded-2xl font-black uppercase text-xs gap-2 px-8 h-12 shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add {labelType} to My List
        </Button>
      )}

      {existingItem && existingItem.status === 'COMPLETED' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-2xl border border-green-500/20">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Finished</span>
        </div>
      )}

      {/* Dialogs */}
      <AddItemDialog
        isManualOpen={isAddOpen}
        showTrigger={false}
        onClose={() => {
          setIsAddOpen(false)
          loadData() // Refresh to see if added
        }}
        preselectedMedia={type !== 'game' ? mediaData : undefined}
        preselectedGame={type === 'game' ? mediaData as any : undefined}
      />

      {existingItem && (
        <ItemDetailsDialog
          item={existingItem}
          listId={existingItem.listId}
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false)
            loadData() // Refresh status
          }}
          isOwner={true}
        />
      )}
    </div>
  )
}

function SkeletonButtons() {
  return (
    <div className="flex gap-3">
      <div className="h-12 w-48 bg-muted animate-pulse rounded-2xl" />
    </div>
  )
}
