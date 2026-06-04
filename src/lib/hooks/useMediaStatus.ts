'use client'

import { useState, useEffect } from 'react'
import { getMediaStatusAction } from '@/actions/servarr'

export interface MediaStatus {
  inLibrary: boolean
  hasFile: boolean
  progress: number | null
}

export function useMediaStatus(itemId: string, mediaType: string | null | undefined, enabled: boolean) {
  const [status, setStatus] = useState<MediaStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    if (!enabled || (mediaType !== 'MOVIE' && mediaType !== 'SHOW')) return
    
    try {
      const result = await getMediaStatusAction(itemId)
      if (result) {
        setStatus(result)
      }
    } catch (error) {
      console.error('Error fetching media status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled) return

    setLoading(true)
    fetchStatus()

    // Poll for status if it's currently downloading
    const interval = setInterval(() => {
      fetchStatus()
    }, 15000) // Poll every 15 seconds

    return () => clearInterval(interval)
  }, [itemId, enabled, mediaType])

  return { status, loading, refresh: fetchStatus }
}
