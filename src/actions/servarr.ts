'use server'

import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  addMovieToRadarr,
  addSeriesToSonarr,
  getTvdbIdFromTmdb,
  getMovieStatus,
  getSeriesStatus,
  deleteMovieFromRadarr,
  deleteSeriesFromSonarr,
  getSeriesSeasons,
  updateSeriesMonitoredSeasons
} from '@/lib/servarr-api'
import { MediaType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt } from '@/lib/encryption'
import { verifyListAccess } from '@/lib/permissions'

export async function getServarrConfigAction() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const config = await prisma.servarrConfig.findUnique({
    where: { userId: session.user.id },
  })

  if (!config) return null

  // Mask sensitive info before sending to client
  return {
    ...config,
    radarrApiKey: config.radarrApiKey ? '********' : '',
    sonarrApiKey: config.sonarrApiKey ? '********' : '',
  }
}

export async function saveServarrConfigAction(data: {
  radarrUrl?: string
  radarrApiKey?: string
  radarrRootFolder?: string
  radarrQualityProfileId?: number
  sonarrUrl?: string
  sonarrApiKey?: string
  sonarrRootFolder?: string
  sonarrQualityProfileId?: number
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  // Only encrypt if a new key is provided (not the masked placeholder)
  const updateData: any = { ...data }
  if (data.radarrApiKey && data.radarrApiKey !== '********') {
    updateData.radarrApiKey = encrypt(data.radarrApiKey)
  } else if (data.radarrApiKey === '********') {
    delete updateData.radarrApiKey // Don't overwrite with placeholder
  }

  if (data.sonarrApiKey && data.sonarrApiKey !== '********') {
    updateData.sonarrApiKey = encrypt(data.sonarrApiKey)
  } else if (data.sonarrApiKey === '********') {
    delete updateData.sonarrApiKey // Don't overwrite with placeholder
  }

  await prisma.servarrConfig.upsert({
    where: { userId: session.user.id },
    update: updateData,
    create: {
      ...updateData,
      userId: session.user.id,
    },
  })

  revalidatePath('/')
  return { success: true }
}

// Returns the list owner's decrypted Servarr config for a given item.
// This lets shared-list members trigger downloads/status checks using the
// owner's server config without ever seeing the API keys themselves.
async function getOwnerConfigForItem(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { media: true, list: { include: { user: { include: { servarrConfig: true } } } } },
  })
  if (!item) return { item: null, config: null }

  const ownerConfig = item.list.user.servarrConfig
  if (!ownerConfig) return { item, config: null }

  const config = {
    ...ownerConfig,
    radarrApiKey: ownerConfig.radarrApiKey ? decrypt(ownerConfig.radarrApiKey) : null,
    sonarrApiKey: ownerConfig.sonarrApiKey ? decrypt(ownerConfig.sonarrApiKey) : null,
  }
  return { item, config }
}

export async function getMediaStatusAction(itemId: string) {
  const defaultStatus = { inLibrary: false, hasFile: false, progress: null, serverId: null as number | null }

  const session = await auth()
  if (!session?.user?.id) return defaultStatus

  // Security check: must have at least view access to the list
  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { listId: true, media: true, mediaType: true } })
  if (!item || !item.media?.externalId) return defaultStatus
  try {
    await verifyListAccess(item.listId, 'VIEW')
  } catch (e) {
    return defaultStatus
  }

  const { config } = await getOwnerConfigForItem(itemId)
  if (!config) return defaultStatus

  const externalId = item.media.externalId

  if (item.mediaType === MediaType.MOVIE) {
    return await getMovieStatus(parseInt(externalId), config)
  } else if (item.mediaType === MediaType.SHOW) {
    const tvdbId = await getTvdbIdFromTmdb(externalId)
    if (!tvdbId) throw new Error('Could not find TVDB ID for this show')
    return await getSeriesStatus(tvdbId, config)
  }

  return defaultStatus
}

export async function removeMediaFromServerAction(itemId: string, serverId: number, deleteFiles: boolean = false) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  // Only the list owner can remove from server
  const { item, config } = await getOwnerConfigForItem(itemId)
  if (!item) throw new Error('Item not found')
  await verifyListAccess(item.listId, 'OWNER')
  if (!config) throw new Error('List owner has not configured Radarr/Sonarr.')

  try {
    if (item.mediaType === MediaType.MOVIE) {
      await deleteMovieFromRadarr(serverId, deleteFiles, config)
      return { success: true, message: `Removed ${item.title} from Radarr` }
    } else if (item.mediaType === MediaType.SHOW) {
      await deleteSeriesFromSonarr(serverId, deleteFiles, config)
      return { success: true, message: `Removed ${item.title} from Sonarr` }
    }
  } catch (error: any) {
    console.error('Removal action error:', error)
    return { success: false, error: error.message || 'Failed to remove from server' }
  }

  throw new Error('Unsupported media type for removal')
}

export async function downloadMediaAction(itemId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const { item, config } = await getOwnerConfigForItem(itemId)

  if (!item) throw new Error('Item not found')

  // Must have at least view access to the list to trigger a download
  await verifyListAccess(item.listId, 'VIEW')

  if (!config) {
    throw new Error('The list owner has not configured Radarr/Sonarr. Ask them to set it up in their settings.')
  }

  if (item.mediaType === MediaType.MOVIE && !config.radarrApiKey) {
    throw new Error('Radarr API Key is missing from the list owner\'s settings.')
  }
  if (item.mediaType === MediaType.SHOW && !config.sonarrApiKey) {
    throw new Error('Sonarr API Key is missing from the list owner\'s settings.')
  }

  if (item.type !== 'MEDIA' || !item.media?.externalId) {
    throw new Error('Item is not a downloadable media')
  }

  const externalId = item.media.externalId
  const title = item.title

  try {
    if (item.mediaType === MediaType.MOVIE) {
      const result = await addMovieToRadarr({
        tmdbId: parseInt(externalId),
        title,
        year: item.dueDate ? new Date(item.dueDate).getFullYear() : new Date().getFullYear(),
      }, config)
      const msg = result?.alreadyExists ? `${title} is already in Radarr` : `Sent ${title} to Radarr`
      return { success: true, message: msg }
    } else if (item.mediaType === MediaType.SHOW) {
      const tvdbId = await getTvdbIdFromTmdb(externalId)
      if (!tvdbId) throw new Error('Could not find TVDB ID for this show')

      const streamingInfo = item.media?.streamingInfo as any
      const monitoredSeasons: number[] | undefined = streamingInfo?.monitoredSeasons

      const result = await addSeriesToSonarr({ tvdbId, title, monitoredSeasons }, config)
      const seasonSummary = monitoredSeasons?.length
        ? ` (S${monitoredSeasons.sort((a, b) => a - b).join(', S')})`
        : ''
      const msg = result?.alreadyExists
        ? `${title} is already in Sonarr`
        : `Sent ${title}${seasonSummary} to Sonarr`
      return { success: true, message: msg }
    }
  } catch (error: any) {
    console.error('Download action error:', error)
    const cause = error?.cause
    const isNetworkError = cause?.code === 'ECONNRESET' || cause?.code === 'ECONNREFUSED' || cause?.code === 'ETIMEDOUT' || error?.message === 'fetch failed'
    if (isNetworkError) {
      const host = cause?.host || 'your server'
      return { success: false, error: `Could not reach ${host}. Check that your Sonarr/Radarr URL is correct and the server is reachable. If using Tailscale, try the local IP (e.g. http://192.168.x.x:8989) or enable HTTPS certs on the machine.` }
    }
    return { success: false, error: error.message || 'Failed to trigger download' }
  }

  throw new Error('Unsupported media type for download')
}

export async function getSeriesSeasonsAction(itemId: string) {
  const empty = { inLibrary: false, serverId: null as number | null, seasons: [] as any[] }

  const session = await auth()
  if (!session?.user?.id) return empty

  const { item, config } = await getOwnerConfigForItem(itemId)
  if (!item || item.mediaType !== MediaType.SHOW || !item.media?.externalId) return empty

  try {
    await verifyListAccess(item.listId, 'VIEW')
  } catch (e) {
    return empty
  }

  if (!config?.sonarrApiKey) return empty

  const tvdbId = await getTvdbIdFromTmdb(item.media.externalId)
  if (!tvdbId) throw new Error('Could not find TVDB ID for this show')

  return await getSeriesSeasons(tvdbId, config)
}

export async function updateSeriesSeasonsAction(
  itemId: string,
  monitoredSeasons: number[],
  deleteFilesForSeasons: number[] = []
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const { item, config } = await getOwnerConfigForItem(itemId)
  if (!item) throw new Error('Item not found')

  // Changing monitoring needs VIEW (same as download); deleting files needs OWNER.
  await verifyListAccess(item.listId, deleteFilesForSeasons.length > 0 ? 'OWNER' : 'VIEW')

  if (!config?.sonarrApiKey) throw new Error('The list owner has not configured Sonarr.')
  if (item.mediaType !== MediaType.SHOW || !item.media?.externalId) {
    throw new Error('Item is not a TV show')
  }

  const tvdbId = await getTvdbIdFromTmdb(item.media.externalId)
  if (!tvdbId) throw new Error('Could not find TVDB ID for this show')

  const { inLibrary, serverId } = await getSeriesSeasons(tvdbId, config)
  if (!inLibrary || !serverId) {
    return { success: false, error: 'This show is not in Sonarr yet — download it first.' }
  }

  try {
    await updateSeriesMonitoredSeasons(serverId, monitoredSeasons, config, deleteFilesForSeasons)

    // Keep the item's stored selection in sync
    await prisma.mediaMetadata.update({
      where: { itemId },
      data: {
        streamingInfo: {
          ...((item.media.streamingInfo as any) ?? {}),
          monitoredSeasons,
        },
      },
    }).catch(() => {})

    return { success: true, message: 'Seasons updated' }
  } catch (error: any) {
    console.error('Update seasons error:', error)
    const cause = error?.cause
    const isNetworkError = cause?.code === 'ECONNRESET' || cause?.code === 'ECONNREFUSED' || cause?.code === 'ETIMEDOUT' || error?.message === 'fetch failed'
    if (isNetworkError) {
      return { success: false, error: `Could not reach ${cause?.host || 'your Sonarr server'}.` }
    }
    return { success: false, error: error.message || 'Failed to update seasons' }
  }
}
