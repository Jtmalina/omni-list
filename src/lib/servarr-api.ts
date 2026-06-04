
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
