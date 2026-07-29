import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '@/test/prisma-mock' // registers the prisma mock first
import { auth } from '@/lib/auth'
import { verifyListAccess } from '@/lib/permissions'
import * as servarrApi from '@/lib/servarr-api'
import {
  downloadMediaAction,
  removeMediaFromServerAction,
  updateSeriesSeasonsAction,
  getMediaStatusAction,
  saveSeasonPreferenceAction,
} from './servarr'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/permissions', () => ({ verifyListAccess: vi.fn() }))
vi.mock('@/lib/encryption', () => ({
  decrypt: (v: string) => v.replace('enc:', ''),
  encrypt: (v: string) => `enc:${v}`,
}))
// Rate limiting is exercised in its own unit test — no-op it here.
vi.mock('@/lib/rate-limit', () => ({
  enforceRateLimit: vi.fn(),
  rateLimit: vi.fn(() => ({ ok: true, retryAfter: 0 })),
}))
vi.mock('@/lib/servarr-api', () => ({
  addMovieToRadarr: vi.fn(() => Promise.resolve({})),
  addSeriesToSonarr: vi.fn(() => Promise.resolve({})),
  getTvdbIdFromTmdb: vi.fn(() => Promise.resolve(555)),
  getMovieStatus: vi.fn(() => Promise.resolve({ inLibrary: true, hasFile: true, progress: null, serverId: 1 })),
  getSeriesStatus: vi.fn(() => Promise.resolve({ inLibrary: false, hasFile: false, progress: null, serverId: null })),
  deleteMovieFromRadarr: vi.fn(() => Promise.resolve({ success: true })),
  deleteSeriesFromSonarr: vi.fn(() => Promise.resolve({ success: true })),
  getSeriesSeasons: vi.fn(() => Promise.resolve({ inLibrary: true, serverId: 9, seasons: [] })),
  updateSeriesMonitoredSeasons: vi.fn(() => Promise.resolve({ success: true })),
}))

const OWNER = 'owner-1'
const GUEST = 'guest-1'

// Builds the item shape returned by getOwnerConfigForItem's nested query.
function mockOwnerItem(overrides: Partial<any> = {}) {
  return {
    id: 'item-1',
    listId: 'list-1',
    type: 'MEDIA',
    title: 'Inception',
    dueDate: null,
    mediaType: 'MOVIE',
    media: { externalId: '27205', streamingInfo: {} },
    list: {
      user: {
        servarrConfig: {
          radarrUrl: 'http://radarr',
          radarrApiKey: 'enc:key',
          sonarrUrl: 'http://sonarr',
          sonarrApiKey: 'enc:key',
        },
      },
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ user: { id: GUEST } } as any)
  vi.mocked(verifyListAccess).mockResolvedValue(GUEST)
})

describe('downloadMediaAction', () => {
  it('rejects an unauthenticated caller', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    await expect(downloadMediaAction('item-1')).rejects.toThrow('Unauthorized')
  })

  it('only requires VIEW access (shared members can download)', async () => {
    prismaMock.item.findUnique.mockResolvedValue(mockOwnerItem() as any)
    const res = await downloadMediaAction('item-1')
    expect(res.success).toBe(true)
    expect(verifyListAccess).toHaveBeenCalledWith('list-1', 'VIEW')
  })

  it("uses the list owner's Servarr config", async () => {
    prismaMock.item.findUnique.mockResolvedValue(mockOwnerItem() as any)
    await downloadMediaAction('item-1')
    // decrypt turns 'enc:key' -> 'key'; owner config is passed to the API call
    expect(servarrApi.addMovieToRadarr).toHaveBeenCalledWith(
      expect.objectContaining({ tmdbId: 27205 }),
      expect.objectContaining({ radarrApiKey: 'key' }),
    )
  })

  it('fails clearly when the owner has no Servarr config', async () => {
    prismaMock.item.findUnique.mockResolvedValue(
      mockOwnerItem({ list: { user: { servarrConfig: null } } }) as any,
    )
    await expect(downloadMediaAction('item-1')).rejects.toThrow(/has not configured Radarr\/Sonarr/)
  })
})

describe('removeMediaFromServerAction', () => {
  it('requires OWNER access', async () => {
    prismaMock.item.findUnique.mockResolvedValue(mockOwnerItem() as any)
    await removeMediaFromServerAction('item-1', 1, false)
    expect(verifyListAccess).toHaveBeenCalledWith('list-1', 'OWNER')
  })
})

describe('updateSeriesSeasonsAction', () => {
  const showItem = () => mockOwnerItem({ mediaType: 'SHOW', media: { externalId: '1399', streamingInfo: {} } })

  it('requires only VIEW access when not deleting files', async () => {
    prismaMock.item.findUnique.mockResolvedValue(showItem() as any)
    prismaMock.mediaMetadata.update.mockResolvedValue({} as any)
    await updateSeriesSeasonsAction('item-1', [1, 2], [])
    expect(verifyListAccess).toHaveBeenCalledWith('list-1', 'VIEW')
  })

  it('escalates to OWNER access when deleting files', async () => {
    prismaMock.item.findUnique.mockResolvedValue(showItem() as any)
    prismaMock.mediaMetadata.update.mockResolvedValue({} as any)
    await updateSeriesSeasonsAction('item-1', [1], [2])
    expect(verifyListAccess).toHaveBeenCalledWith('list-1', 'OWNER')
  })

  it('rejects malformed season input', async () => {
    prismaMock.item.findUnique.mockResolvedValue(showItem() as any)
    await expect(updateSeriesSeasonsAction('item-1', [1.5] as any, [])).rejects.toThrow('Invalid seasons.')
  })
})

describe('saveSeasonPreferenceAction', () => {
  it('requires EDIT access and validates input', async () => {
    prismaMock.item.findUnique.mockResolvedValue({ id: 'item-1', listId: 'list-1', media: { streamingInfo: {} } } as any)
    prismaMock.mediaMetadata.update.mockResolvedValue({} as any)
    await saveSeasonPreferenceAction('item-1', [1, 2])
    expect(verifyListAccess).toHaveBeenCalledWith('list-1', 'EDIT')
  })

  it('rejects a bad item id before doing anything', async () => {
    await expect(saveSeasonPreferenceAction('bad id', [1])).rejects.toThrow('Invalid item id.')
    expect(prismaMock.mediaMetadata.update).not.toHaveBeenCalled()
  })
})

describe('getMediaStatusAction', () => {
  const DEFAULT = { inLibrary: false, hasFile: false, progress: null, serverId: null }

  const ownerConfig = {
    radarrUrl: 'http://radarr', radarrApiKey: 'enc:key',
    sonarrUrl: 'http://sonarr', sonarrApiKey: 'enc:key',
  }

  // Item shape returned by the consolidated single query.
  function statusItem(overrides: Partial<any> = {}) {
    return {
      mediaType: 'MOVIE',
      media: { externalId: '27205' },
      list: {
        userId: GUEST,        // caller owns the list by default
        sharedWith: [],
        user: { servarrConfig: ownerConfig },
      },
      ...overrides,
    }
  }

  it('returns a safe default for an unauthenticated caller', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    await expect(getMediaStatusAction('item-1')).resolves.toEqual(DEFAULT)
  })

  it('returns a safe default when the caller is neither owner nor shared', async () => {
    prismaMock.item.findUnique.mockResolvedValue(
      statusItem({ list: { userId: 'someone-else', sharedWith: [], user: { servarrConfig: ownerConfig } } }) as any,
    )
    await expect(getMediaStatusAction('item-1')).resolves.toEqual(DEFAULT)
  })

  it('returns a safe default when the list owner has no Servarr config', async () => {
    prismaMock.item.findUnique.mockResolvedValue(
      statusItem({ list: { userId: GUEST, sharedWith: [], user: { servarrConfig: null } } }) as any,
    )
    await expect(getMediaStatusAction('item-1')).resolves.toEqual(DEFAULT)
  })

  it("reads status for the owner using the owner's decrypted config", async () => {
    prismaMock.item.findUnique.mockResolvedValue(statusItem() as any)
    const res = await getMediaStatusAction('item-1')
    expect(res).toEqual({ inLibrary: true, hasFile: true, progress: null, serverId: 1 })
    expect(servarrApi.getMovieStatus).toHaveBeenCalledWith(27205, expect.objectContaining({ radarrApiKey: 'key' }))
  })

  it('lets a shared viewer (not the owner) read status', async () => {
    prismaMock.item.findUnique.mockResolvedValue(
      statusItem({ list: { userId: 'owner-x', sharedWith: [{ userId: GUEST }], user: { servarrConfig: ownerConfig } } }) as any,
    )
    const res = await getMediaStatusAction('item-1')
    expect(res).toEqual({ inLibrary: true, hasFile: true, progress: null, serverId: 1 })
    expect(servarrApi.getMovieStatus).toHaveBeenCalled()
  })
})
