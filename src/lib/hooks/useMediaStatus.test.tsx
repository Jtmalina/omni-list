import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import React from 'react'

vi.mock('@/actions/servarr', () => ({ getMediaStatusAction: vi.fn() }))
import { getMediaStatusAction } from '@/actions/servarr'
import { useMediaStatus, pollIntervalFor, POLL_MS } from './useMediaStatus'

// Fresh SWR cache per hook render so call counts are isolated between tests.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
)

describe('pollIntervalFor', () => {
  it('does not poll when idle (progress is null)', () => {
    expect(pollIntervalFor(null)).toBe(0)
    expect(pollIntervalFor(undefined)).toBe(0)
    expect(pollIntervalFor({ inLibrary: true, hasFile: true, progress: null, serverId: 1 })).toBe(0)
  })

  it('polls while a download is actively in progress', () => {
    expect(pollIntervalFor({ inLibrary: true, hasFile: false, progress: 42, serverId: 1 })).toBe(POLL_MS)
    // 0% is still "downloading" — it's a number, not null
    expect(pollIntervalFor({ inLibrary: false, hasFile: false, progress: 0, serverId: null })).toBe(POLL_MS)
  })
})

describe('useMediaStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not fetch for non movie/show types', () => {
    renderHook(() => useMediaStatus('game-1', 'GAME', true), { wrapper })
    expect(getMediaStatusAction).not.toHaveBeenCalled()
  })

  it('does not fetch when disabled (no Servarr configured)', () => {
    renderHook(() => useMediaStatus('movie-1', 'MOVIE', false), { wrapper })
    expect(getMediaStatusAction).not.toHaveBeenCalled()
  })

  it('fetches once for an enabled movie and exposes the status', async () => {
    const status = { inLibrary: true, hasFile: true, progress: null, serverId: 7 }
    vi.mocked(getMediaStatusAction).mockResolvedValue(status)

    const { result } = renderHook(() => useMediaStatus('movie-2', 'MOVIE', true), { wrapper })

    await waitFor(() => expect(result.current.status).toEqual(status))
    expect(getMediaStatusAction).toHaveBeenCalledTimes(1)
    expect(getMediaStatusAction).toHaveBeenCalledWith('movie-2')
  })
})
