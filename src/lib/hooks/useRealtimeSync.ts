'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function useRealtimeSync(listId?: string) {
  const router = useRouter()

  useEffect(() => {
    // 1. Listen for Item changes in the specific list
    const itemChannel = supabase
      .channel(`list-items-${listId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Item',
          filter: listId ? `listId=eq.${listId}` : undefined,
        },
        () => {
          // Tell Next.js to refresh the server data
          router.refresh()
        }
      )
      .subscribe()

    // 2. Listen for Activity changes (Social Feed)
    const activityChannel = supabase
      .channel('social-activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Activity',
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(itemChannel)
      supabase.removeChannel(activityChannel)
    }
  }, [listId, router])
}
