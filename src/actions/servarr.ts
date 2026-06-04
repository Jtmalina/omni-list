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
  deleteSeriesFromSonarr
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

export async function getMediaStatusAction(itemId: string) {
  const defaultStatus = { inLibrary: false, hasFile: false, progress: null, serverId: null as number | null }
  
  const session = await auth()
  if (!session?.user?.id) return defaultStatus

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { servarrConfig: true },
  })

  if (!user?.servarrConfig) return defaultStatus

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      media: true,
      list: true,
    },
  })

  if (!item || !item.media?.externalId) return defaultStatus

  // Security check: must be owner or have at least view access
  try {
    await verifyListAccess(item.listId, 'VIEW')
  } catch (e) {
    return defaultStatus
  }

  const config = {
    ...user.servarrConfig,
    radarrApiKey: user.servarrConfig.radarrApiKey ? decrypt(user.servarrConfig.radarrApiKey) : null,
    sonarrApiKey: user.servarrConfig.sonarrApiKey ? decrypt(user.servarrConfig.sonarrApiKey) : null,
  }

  const externalId = item.media.externalId

  try {
    if (item.mediaType === MediaType.MOVIE) {
      return await getMovieStatus(parseInt(externalId), config)
    } else if (item.mediaType === MediaType.SHOW) {
      const tvdbId = await getTvdbIdFromTmdb(externalId)
      if (!tvdbId) return defaultStatus
      return await getSeriesStatus(tvdbId, config)
    }
  } catch (error) {
    console.error('Failed to get media status:', error)
    return defaultStatus
  }

  return defaultStatus
}

export async function removeMediaFromServerAction(itemId: string, serverId: number, deleteFiles: boolean = false) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { servarrConfig: true },
  })

  if (!user?.servarrConfig) {
    throw new Error('Please configure your Radarr/Sonarr settings first.')
  }

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { list: true }
  })

  if (!item) throw new Error('Item not found')
  
  // Security check: must be owner to delete from server
  await verifyListAccess(item.listId, 'OWNER')

  const config = {
    ...user.servarrConfig,
    radarrApiKey: user.servarrConfig.radarrApiKey ? decrypt(user.servarrConfig.radarrApiKey) : null,
    sonarrApiKey: user.servarrConfig.sonarrApiKey ? decrypt(user.servarrConfig.sonarrApiKey) : null,
  }

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { servarrConfig: true },
  })

  if (!user?.servarrConfig) {
    throw new Error('Please configure your Radarr/Sonarr settings first.')
  }

  // Decrypt keys before use with error handling
  let config: any
  try {
    config = {
      ...user.servarrConfig,
      radarrApiKey: user.servarrConfig.radarrApiKey ? decrypt(user.servarrConfig.radarrApiKey) : null,
      sonarrApiKey: user.servarrConfig.sonarrApiKey ? decrypt(user.servarrConfig.sonarrApiKey) : null,
    }
  } catch (error: any) {
    throw new Error(error.message || 'Decryption failed. Please re-save your settings in the gear icon menu.')
  }

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      media: true,
      list: true,
    },
  })

  if (!item || item.list.userId !== session.user.id) {
    throw new Error('Unauthorized or item not found')
  }

  if (item.mediaType === MediaType.MOVIE && !config.radarrApiKey) {
    throw new Error('Radarr API Key is missing. Please update your settings.')
  }
  if (item.mediaType === MediaType.SHOW && !config.sonarrApiKey) {
    throw new Error('Sonarr API Key is missing. Please update your settings.')
  }

  if (item.type !== 'MEDIA' || !item.media?.externalId) {
    throw new Error('Item is not a downloadable media')
  }

  const externalId = item.media.externalId
  const title = item.title

  try {
    if (item.mediaType === MediaType.MOVIE) {
      await addMovieToRadarr({
        tmdbId: parseInt(externalId),
        title,
        year: item.dueDate ? new Date(item.dueDate).getFullYear() : new Date().getFullYear(),
      }, config)
      return { success: true, message: `Sent ${title} to Radarr` }
    } else if (item.mediaType === MediaType.SHOW) {
      const tvdbId = await getTvdbIdFromTmdb(externalId)
      if (!tvdbId) throw new Error('Could not find TVDB ID for this show')

      await addSeriesToSonarr({
        tvdbId,
        title,
      }, config)
      return { success: true, message: `Sent ${title} to Sonarr` }
    }
  } catch (error: any) {
    console.error('Download action error:', error)
    return { success: false, error: error.message || 'Failed to trigger download' }
  }

  throw new Error('Unsupported media type for download')
}
