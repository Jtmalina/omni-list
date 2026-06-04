
export interface ServarrConfig {
  radarrUrl?: string | null
  radarrApiKey?: string | null
  radarrRootFolder?: string | null
  radarrQualityProfileId?: number | null
  sonarrUrl?: string | null
  sonarrApiKey?: string | null
  sonarrRootFolder?: string | null
  sonarrQualityProfileId?: number | null
}

export async function addMovieToRadarr(movie: {
  tmdbId: number;
  title: string;
  year: number;
}, config: ServarrConfig) {
  const baseUrl = config.radarrUrl?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  const apiKey = config.radarrApiKey?.trim().replace(/^["']|["']$/g, '');
  const rootFolder = config.radarrRootFolder || '/movies';
  const qualityProfileId = config.radarrQualityProfileId || 1;

  if (!baseUrl || !apiKey) {
    throw new Error('Radarr configuration missing in your settings');
  }

  const response = await fetch(`${baseUrl}/api/v3/movie`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      'User-Agent': 'OmniList-App/1.0', // Helps bypass some bot filters
    },
    body: JSON.stringify({
      title: movie.title,
      qualityProfileId: qualityProfileId,
      titleSlug: movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tmdbId: movie.tmdbId,
      rootFolderPath: rootFolder,
      monitored: true,
      addOptions: {
        searchForMovie: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Radarr error: ${error}`);
  }

  return await response.json();
}

export async function addSeriesToSonarr(series: {
  tvdbId: number;
  title: string;
}, config: ServarrConfig) {
  const baseUrl = config.sonarrUrl?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  const apiKey = config.sonarrApiKey?.trim().replace(/^["']|["']$/g, '');
  const rootFolder = config.sonarrRootFolder || '/tv';
  const qualityProfileId = config.sonarrQualityProfileId || 1;

  if (!baseUrl || !apiKey) {
    throw new Error('Sonarr configuration missing in your settings');
  }

  const response = await fetch(`${baseUrl}/api/v3/series`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      'User-Agent': 'OmniList-App/1.0',
    },
    body: JSON.stringify({
      title: series.title,
      qualityProfileId: qualityProfileId,
      titleSlug: series.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tvdbId: series.tvdbId,
      rootFolderPath: rootFolder,
      monitored: true,
      languageProfileId: 1,
      addOptions: {
        searchForMissingEpisodes: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sonarr error: ${error}`);
  }

  return await response.json();
}

export async function getMovieStatus(tmdbId: number, config: ServarrConfig) {
  const baseUrl = config.radarrUrl?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  const apiKey = config.radarrApiKey?.trim().replace(/^["']|["']$/g, '');

  const defaultStatus = { inLibrary: false, hasFile: false, progress: null };
  if (!baseUrl || !apiKey) return defaultStatus;

  try {
    // 1. Check if it's in the library
    const lookupResponse = await fetch(`${baseUrl}/api/v3/movie/lookup/tmdb?tmdbId=${tmdbId}`, {
      headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' }
    });
    
    if (!lookupResponse.ok) return defaultStatus;
    const movieInfo = await lookupResponse.json();
    
    const inLibrary = !!(movieInfo.id && movieInfo.id > 0);
    const hasFile = !!movieInfo.hasFile;

    // 2. Check if it's in the download queue
    const queueResponse = await fetch(`${baseUrl}/api/v3/queue?apikey=${apiKey}`, {
      headers: { 'User-Agent': 'OmniList-App/1.0' }
    });
    
    let progress = null;
    if (queueResponse.ok) {
      const queueData = await queueResponse.json();
      // Look for a record that matches this movie
      const activeDownload = queueData.records?.find((r: any) => 
        (r.movieId && r.movieId === movieInfo.id) || 
        (r.movie?.tmdbId === tmdbId) ||
        (r.title?.toLowerCase().includes(movieInfo.title?.toLowerCase()))
      );

      if (activeDownload) {
        progress = activeDownload.size > 0 
          ? Math.round(((activeDownload.size - activeDownload.sizeleft) / activeDownload.size) * 100)
          : 0;
      }
    }

    return { inLibrary, hasFile, progress };
  } catch (error) {
    console.error('Radarr status fetch failed:', error);
    return defaultStatus;
  }
}

export async function getSeriesStatus(tvdbId: number, config: ServarrConfig) {
  const baseUrl = config.sonarrUrl?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  const apiKey = config.sonarrApiKey?.trim().replace(/^["']|["']$/g, '');

  const defaultStatus = { inLibrary: false, hasFile: false, progress: null };
  if (!baseUrl || !apiKey) return defaultStatus;

  try {
    // 1. Check if it's in the library
    const lookupResponse = await fetch(`${baseUrl}/api/v3/series/lookup?term=tvdb:${tvdbId}`, {
      headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' }
    });
    
    if (!lookupResponse.ok) return defaultStatus;
    const lookupResults = await lookupResponse.json();
    const seriesInfo = lookupResults[0]; 
    
    if (!seriesInfo) return defaultStatus;

    const inLibrary = !!(seriesInfo.id && seriesInfo.id > 0);
    const statistics = seriesInfo.statistics;
    const hasFile = statistics ? (statistics.episodeFileCount >= statistics.totalEpisodeCount && statistics.totalEpisodeCount > 0) : false;

    // 2. Check queue
    const queueResponse = await fetch(`${baseUrl}/api/v3/queue?apikey=${apiKey}`, {
      headers: { 'User-Agent': 'OmniList-App/1.0' }
    });
    
    let progress = null;
    if (queueResponse.ok) {
      const queueData = await queueResponse.json();
      const activeDownload = queueData.records?.find((r: any) => 
        (r.seriesId && r.seriesId === seriesInfo.id) ||
        (r.series?.tvdbId === tvdbId)
      );
      
      if (activeDownload) {
        progress = activeDownload.size > 0 
          ? Math.round(((activeDownload.size - activeDownload.sizeleft) / activeDownload.size) * 100)
          : 0;
      }
    }

    return { inLibrary, hasFile, progress };
  } catch (error) {
    console.error('Sonarr status fetch failed:', error);
    return defaultStatus;
  }
}

export async function getTvdbIdFromTmdb(tmdbId: string): Promise<number | null> {
  const token = process.env.TMDB_API_KEY?.trim().replace(/^["']|["']$/g, '');
  if (!token) return null;

  const response = await fetch(
    `https://api.themoviedb.org/3/tv/${tmdbId}/external_ids`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data.tvdb_id;
}
