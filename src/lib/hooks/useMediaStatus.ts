'use client'

import { useState, useEffect } from 'react'
import { getMediaStatusAction } from '@/actions/servarr'

export interface MediaStatus {
  inLibrary: boolean
  hasFile: boolean
  progress: number | null
  serverId: number | null
}

export function useMediaStatus(itemId: string, mediaType: string | null | undefined, enabled: boolean) {
  const [status, setStatus] = useState<MediaStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    if (!enabled || (mediaType !== 'MOVIE' && mediaType !== 'SHOW')) return

    setLoading(true)
    setError(null)
    try {
      const result = await getMediaStatusAction(itemId)
      if (result) setStatus(result)
    } catch (err: any) {
      console.error('Error fetching media status:', err)
      setError(err?.message || 'Could not reach server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled) return

    fetchStatus()

    // Only keep polling if something is actively downloading
    const interval = setInterval(() => {
      if (status?.progress !== null) fetchStatus()
    }, 15000)

    return () => clearInterval(interval)
  }, [itemId, enabled, mediaType])

  return { status, loading, error, refresh: fetchStatus }
}
