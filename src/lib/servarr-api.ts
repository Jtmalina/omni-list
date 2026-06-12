import https from 'node:https'
import http from 'node:http'

// Allow self-signed / internal TLS certs for user-hosted Radarr/Sonarr servers
// (Tailscale MagicDNS, local IPs, home-lab certs, etc.)
// Native fetch doesn't support custom agents, so we use node:https directly.
function servarrFetch(url: string, init?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const isHttps = parsed.protocol === 'https:'
    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: (init?.method as string) || 'GET',
      headers: init?.headers as Record<string, string>,
      ...(isHttps && { rejectUnauthorized: false }),
    }

    const transport = isHttps ? https : http
    const req = (transport as typeof https).request(options as https.RequestOptions, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks)
        resolve(new Response(body, {
          status: res.statusCode ?? 200,
          headers: res.headers as Record<string, string>,
        }))
      })
    })

    req.on('error', reject)

    if (init?.body) {
      req.write(init.body)
    }
    req.end()
  })
}

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

  const response = await servarrFetch(`${baseUrl}/api/v3/movie`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      'User-Agent': 'OmniList-App/1.0',
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
    if (response.status === 409) {
      // Already in Radarr — treat as success
      return { alreadyExists: true }
    }
    const error = await response.text();
    throw new Error(`Radarr error (${response.status}): ${error || 'no details returned'}`);
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

  const response = await servarrFetch(`${baseUrl}/api/v3/series`, {
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
    if (response.status === 409) {
      // Already in Sonarr — treat as success
      return { alreadyExists: true }
    }
    const error = await response.text();
    throw new Error(`Sonarr error (${response.status}): ${error || 'no details returned'}`);
  }

  return await response.json();
}

export async function deleteMovieFromRadarr(radarrId: number, deleteFiles: boolean, config: ServarrConfig) {
  const baseUrl = config.radarrUrl?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  const apiKey = config.radarrApiKey?.trim().replace(/^["']|["']$/g, '');

  if (!baseUrl || !apiKey) throw new Error('Radarr configuration missing');

  const response = await servarrFetch(`${baseUrl}/api/v3/movie/${radarrId}?deleteFiles=${deleteFiles}&addImportListExclusion=true`, {
    method: 'DELETE',
    headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Radarr deletion error: ${error}`);
  }

  return { success: true };
}

export async function deleteSeriesFromSonarr(sonarrId: number, deleteFiles: boolean, config: ServarrConfig) {
  const baseUrl = config.sonarrUrl?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  const apiKey = config.sonarrApiKey?.trim().replace(/^["']|["']$/g, '');

  if (!baseUrl || !apiKey) throw new Error('Sonarr configuration missing');

  const response = await servarrFetch(`${baseUrl}/api/v3/series/${sonarrId}?deleteFiles=${deleteFiles}&addImportListExclusion=true`, {
    method: 'DELETE',
    headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sonarr deletion error: ${error}`);
  }

  return { success: true };
}

export async function getMovieStatus(tmdbId: number, config: ServarrConfig) {
  const baseUrl = config.radarrUrl?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  const apiKey = config.radarrApiKey?.trim().replace(/^["']|["']$/g, '');

  const defaultStatus = { inLibrary: false, hasFile: false, progress: null, serverId: null as number | null };
  if (!baseUrl || !apiKey) return defaultStatus;

  // 1. Check library — GET /api/v3/movie returns all movies; filter by tmdbId.
  //    More reliable than the lookup endpoint which may 404 for non-library titles.
  const moviesResponse = await servarrFetch(`${baseUrl}/api/v3/movie`, {
    headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' }
  });

  if (!moviesResponse.ok) {
    throw new Error(`Radarr responded ${moviesResponse.status} when checking library`)
  }

  const allMovies: any[] = await moviesResponse.json();
  const movieInfo = allMovies.find((m: any) => m.tmdbId === tmdbId);

  const inLibrary = !!movieInfo;
  const hasFile = !!movieInfo?.hasFile;
  const serverId = movieInfo?.id ?? null;

  // 2. Check download queue
  const queueResponse = await servarrFetch(`${baseUrl}/api/v3/queue`, {
    headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' }
  });

  let progress = null;
  if (queueResponse.ok) {
    const queueData = await queueResponse.json();
    const activeDownload = queueData.records?.find((r: any) =>
      r.movie?.tmdbId === tmdbId || (serverId && r.movieId === serverId)
    );
    if (activeDownload) {
      progress = activeDownload.size > 0
        ? Math.round(((activeDownload.size - activeDownload.sizeleft) / activeDownload.size) * 100)
        : 0;
    }
  }

  return { inLibrary, hasFile, progress, serverId };
}

export async function getSeriesStatus(tvdbId: number, config: ServarrConfig) {
  const baseUrl = config.sonarrUrl?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  const apiKey = config.sonarrApiKey?.trim().replace(/^["']|["']$/g, '');

  const defaultStatus = { inLibrary: false, hasFile: false, progress: null, serverId: null as number | null };
  if (!baseUrl || !apiKey) return defaultStatus;

  // 1. Check library — GET /api/v3/series returns all series; filter by tvdbId.
  const seriesResponse = await servarrFetch(`${baseUrl}/api/v3/series`, {
    headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' }
  });

  if (!seriesResponse.ok) {
    throw new Error(`Sonarr responded ${seriesResponse.status} when checking library`)
  }

  const allSeries: any[] = await seriesResponse.json();
  const seriesInfo = allSeries.find((s: any) => s.tvdbId === tvdbId);

  const inLibrary = !!seriesInfo;
  const statistics = seriesInfo?.statistics;
  const hasFile = statistics
    ? statistics.episodeFileCount >= statistics.totalEpisodeCount && statistics.totalEpisodeCount > 0
    : false;
  const serverId = seriesInfo?.id ?? null;

  // 2. Check download queue
  const queueResponse = await servarrFetch(`${baseUrl}/api/v3/queue`, {
    headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' }
  });

  let progress = null;
  if (queueResponse.ok) {
    const queueData = await queueResponse.json();
    const activeDownload = queueData.records?.find((r: any) =>
      r.series?.tvdbId === tvdbId || (serverId && r.seriesId === serverId)
    );
    if (activeDownload) {
      progress = activeDownload.size > 0
        ? Math.round(((activeDownload.size - activeDownload.sizeleft) / activeDownload.size) * 100)
        : 0;
    }
  }

  return { inLibrary, hasFile, progress, serverId };
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
