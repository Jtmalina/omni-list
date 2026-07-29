import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Chainable supabase mock: channel(name).on(...).subscribe()
const mocks = vi.hoisted(() => {
  const subscribe = vi.fn(() => ({}))
  const on = vi.fn(() => ({ subscribe }))
  const channel = vi.fn(() => ({ on }))
  const removeChannel = vi.fn()
  return { subscribe, on, channel, removeChannel }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { channel: mocks.channel, removeChannel: mocks.removeChannel },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

import { useRealtimeSync } from './useRealtimeSync'

beforeEach(() => vi.clearAllMocks())

describe('useRealtimeSync', () => {
  it('subscribes to a single Item channel scoped to the list', () => {
    renderHook(() => useRealtimeSync('list-1'))

    expect(mocks.channel).toHaveBeenCalledTimes(1)
    expect(mocks.channel).toHaveBeenCalledWith('list-items-list-1')
    expect(mocks.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'Item', filter: 'listId=eq.list-1' }),
      expect.any(Function),
    )
  })

  it('does NOT open a global Activity subscription (cross-user refresh amplifier)', () => {
    renderHook(() => useRealtimeSync('list-1'))

    expect(mocks.channel).toHaveBeenCalledTimes(1)
    expect(mocks.on).not.toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'Activity' }),
      expect.any(Function),
    )
  })

  it('cleans up the subscription on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeSync('list-1'))
    unmount()
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1)
  })
})
