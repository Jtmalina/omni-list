'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function useRealtimeSync(listId?: string) {
  const router = useRouter()

  useEffect(() => {
    if (!supabase) return

    // Listen only for Item changes in THIS list. Scoping by listId keeps the
    // refresh local: a change to one list never re-renders everyone else's page.
    //
    // Note: we deliberately do NOT subscribe to a global Activity stream here.
    // A previous unfiltered Activity subscription called router.refresh() on
    // every connected client for any user's activity anywhere — a large,
    // invisible source of server CPU (the list page doesn't show the feed).
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
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(itemChannel)
    }
  }, [listId, router])
}
