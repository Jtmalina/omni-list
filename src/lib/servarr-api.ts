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
  monitoredSeasons?: number[];
}, config: ServarrConfig) {
  const baseUrl = config.sonarrUrl?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  const apiKey = config.sonarrApiKey?.trim().replace(/^["']|["']$/g, '');
  const rootFolder = config.sonarrRootFolder || '/tv';
  const qualityProfileId = config.sonarrQualityProfileId || 1;

  if (!baseUrl || !apiKey) {
    throw new Error('Sonarr configuration missing in your settings');
  }

  // Build per-season monitored flags if specific seasons were selected.
  // Sonarr needs to know the season numbers upfront — we get them from the
  // lookup endpoint first, then mark only the selected ones as monitored.
  let seasons: { seasonNumber: number; monitored: boolean }[] | undefined
  if (series.monitoredSeasons) {
    const lookupRes = await servarrFetch(
      `${baseUrl}/api/v3/series/lookup?term=tvdb:${series.tvdbId}`,
      { headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' } }
    )
    if (lookupRes.ok) {
      const results: any[] = await lookupRes.json()
      const match = results[0]
      if (match?.seasons) {
        seasons = match.seasons.map((s: any) => ({
          seasonNumber: s.seasonNumber,
          monitored: series.monitoredSeasons!.includes(s.seasonNumber),
        }))
      }
    }
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
      ...(seasons && { seasons }),
      monitorNewItems: seasons ? 'none' : 'all', // don't auto-monitor future seasons if user picked specific ones
      addOptions: {
        searchForMissingEpisodes: true,
        monitor: seasons ? 'none' : 'all', // Sonarr v4 uses this to skip its own season defaulting
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

export interface SeasonInfo {
  seasonNumber: number;
  monitored: boolean;
  episodeFileCount: number;
  totalEpisodeCount: number;
}

// Returns the per-season monitored status + download counts for a series.
export async function getSeriesSeasons(tvdbId: number, config: ServarrConfig): Promise<{
  inLibrary: boolean;
  serverId: number | null;
  seasons: SeasonInfo[];
}> {
  const baseUrl = config.sonarrUrl?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  const apiKey = config.sonarrApiKey?.trim().replace(/^["']|["']$/g, '');

  if (!baseUrl || !apiKey) return { inLibrary: false, serverId: null, seasons: [] };

  const res = await servarrFetch(`${baseUrl}/api/v3/series`, {
    headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' }
  });
  if (!res.ok) throw new Error(`Sonarr responded ${res.status} when checking library`);

  const all: any[] = await res.json();
  const series = all.find((s: any) => s.tvdbId === tvdbId);
  if (!series) return { inLibrary: false, serverId: null, seasons: [] };

  const seasons: SeasonInfo[] = (series.seasons ?? [])
    .filter((s: any) => s.seasonNumber > 0) // exclude specials
    .map((s: any) => ({
      seasonNumber: s.seasonNumber,
      monitored: !!s.monitored,
      episodeFileCount: s.statistics?.episodeFileCount ?? 0,
      totalEpisodeCount: s.statistics?.totalEpisodeCount ?? 0,
    }));

  return { inLibrary: true, serverId: series.id, seasons };
}

// Updates which seasons are monitored on an existing series, optionally deleting
// the episode files for seasons the user is un-monitoring. Triggers a search for
// any newly-monitored seasons.
export async function updateSeriesMonitoredSeasons(
  serverId: number,
  monitoredSeasons: number[],
  config: ServarrConfig,
  deleteFilesForSeasons: number[] = []
): Promise<{ success: boolean }> {
  const baseUrl = config.sonarrUrl?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  const apiKey = config.sonarrApiKey?.trim().replace(/^["']|["']$/g, '');
  if (!baseUrl || !apiKey) throw new Error('Sonarr configuration missing');

  const jsonHeaders = {
    'Content-Type': 'application/json',
    'X-Api-Key': apiKey,
    'User-Agent': 'OmniList-App/1.0',
  };

  // 1. Fetch the full series object (PUT needs the whole thing back)
  const getRes = await servarrFetch(`${baseUrl}/api/v3/series/${serverId}`, {
    headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' }
  });
  if (!getRes.ok) throw new Error(`Sonarr responded ${getRes.status} fetching series`);
  const series = await getRes.json();

  const previouslyMonitored = new Set<number>(
    (series.seasons ?? []).filter((s: any) => s.monitored).map((s: any) => s.seasonNumber)
  );

  // 2. Apply new monitored flags (leave specials / season 0 untouched)
  series.seasons = (series.seasons ?? []).map((s: any) => ({
    ...s,
    monitored: s.seasonNumber === 0 ? s.monitored : monitoredSeasons.includes(s.seasonNumber),
  }));

  // 3. PUT the update
  const putRes = await servarrFetch(`${baseUrl}/api/v3/series/${serverId}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(series),
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Sonarr update error (${putRes.status}): ${err || 'no details returned'}`);
  }

  // 4. Delete files for the requested seasons
  if (deleteFilesForSeasons.length > 0) {
    const efRes = await servarrFetch(`${baseUrl}/api/v3/episodefile?seriesId=${serverId}`, {
      headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' }
    });
    if (efRes.ok) {
      const files: any[] = await efRes.json();
      const idsToDelete = files
        .filter((f: any) => deleteFilesForSeasons.includes(f.seasonNumber))
        .map((f: any) => f.id);
      // Delete one at a time — the per-file endpoint is supported across all
      // Sonarr v3/v4 versions, unlike the bulk endpoint which varies.
      for (const fileId of idsToDelete) {
        await servarrFetch(`${baseUrl}/api/v3/episodefile/${fileId}`, {
          method: 'DELETE',
          headers: { 'X-Api-Key': apiKey, 'User-Agent': 'OmniList-App/1.0' },
        });
      }
    }
  }

  // 5. Search for newly-monitored seasons
  const newlyMonitored = monitoredSeasons.filter(n => !previouslyMonitored.has(n));
  for (const seasonNumber of newlyMonitored) {
    await servarrFetch(`${baseUrl}/api/v3/command`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ name: 'SeasonSearch', seriesId: serverId, seasonNumber }),
    });
  }

  return { success: true };
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
