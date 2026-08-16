import { AuthResponse, BaseItem, FilterOption, ItemQuery, LibraryView } from '../types';

const CLIENT_VERSION = '1.0.0';
const CACHE_LIMIT = 120;
const CACHE_TTL = {
  items: 15_000,
  itemDetails: 60_000,
  userViews: 5 * 60_000,
  genres: 10 * 60_000,
  filters: 10 * 60_000,
  seasons: 5 * 60_000,
  tmdb: 24 * 60 * 60_000,
};

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

interface PendingRequest {
  consumers: number;
  controller: AbortController;
  promise: Promise<unknown>;
  settled: boolean;
}

const responseCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, PendingRequest>();

const cleanUrl = (url: string) => url.replace(/\/$/, '');
const createAbortError = () => new DOMException('Request aborted', 'AbortError');

const getDeviceId = () => {
  const fallback = 'jellysterr-web-client';
  if (typeof window === 'undefined') return fallback;

  const storageKey = 'jellysterr_device_id';
  const stored = localStorage.getItem(storageKey);
  if (stored) return stored;

  const deviceId = globalThis.crypto?.randomUUID?.() || `${fallback}-${Date.now()}`;
  localStorage.setItem(storageKey, deviceId);
  return deviceId;
};

const getHeaders = (token?: string, json = false): Record<string, string> => {
  const authParts = [
    'MediaBrowser Client="Jellysterr"',
    'Device="Web Browser"',
    `DeviceId="${getDeviceId()}"`,
    `Version="${CLIENT_VERSION}"`,
  ];

  if (token) authParts.push(`Token="${token}"`);

  return {
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    'X-Emby-Authorization': authParts.join(', '),
    ...(token ? { 'X-Emby-Token': token } : {}),
  };
};

const getCachedValue = <T>(key: string): T | undefined => {
  const entry = responseCache.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return undefined;
  }

  responseCache.delete(key);
  responseCache.set(key, entry);
  return entry.value as T;
};

const setCachedValue = (key: string, value: unknown, ttlMs: number) => {
  if (ttlMs <= 0) return;

  responseCache.delete(key);
  responseCache.set(key, { expiresAt: Date.now() + ttlMs, value });

  while (responseCache.size > CACHE_LIMIT) {
    const oldestKey = responseCache.keys().next().value;
    if (!oldestKey) break;
    responseCache.delete(oldestKey);
  }
};

const consumePendingRequest = <T>(entry: PendingRequest, signal?: AbortSignal): Promise<T> => {
  if (signal?.aborted) return Promise.reject(createAbortError());

  entry.consumers += 1;

  return new Promise<T>((resolve, reject) => {
    let finished = false;

    const cleanup = () => {
      signal?.removeEventListener('abort', handleAbort);
      entry.consumers = Math.max(0, entry.consumers - 1);
      if (entry.consumers === 0 && !entry.settled) entry.controller.abort();
    };

    const finish = (callback: () => void) => {
      if (finished) return;
      finished = true;
      cleanup();
      callback();
    };

    const handleAbort = () => finish(() => reject(createAbortError()));
    signal?.addEventListener('abort', handleAbort, { once: true });

    entry.promise.then(
      value => finish(() => resolve(value as T)),
      error => finish(() => reject(error)),
    );
  });
};

const requestJson = <T>(
  url: string,
  token: string | undefined,
  cacheScope: string,
  ttlMs: number,
  signal?: AbortSignal,
  includeJellyfinHeaders = true,
): Promise<T> => {
  if (signal?.aborted) return Promise.reject(createAbortError());

  const cacheKey = `${cacheScope}:${url}`;
  const cached = getCachedValue<T>(cacheKey);
  if (cached !== undefined) return Promise.resolve(cached);

  let pending = pendingRequests.get(cacheKey);

  if (!pending) {
    const controller = new AbortController();
    pending = {
      consumers: 0,
      controller,
      promise: Promise.resolve(),
      settled: false,
    };

    const activeRequest = pending;
    activeRequest.promise = fetch(url, {
      headers: includeJellyfinHeaders ? getHeaders(token) : { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        const value = await response.json() as T;
        setCachedValue(cacheKey, value, ttlMs);
        return value;
      })
      .finally(() => {
        activeRequest.settled = true;
        if (pendingRequests.get(cacheKey) === activeRequest) pendingRequests.delete(cacheKey);
      });

    pendingRequests.set(cacheKey, activeRequest);
  }

  return consumePendingRequest<T>(pending, signal);
};

const appendIfPresent = (params: URLSearchParams, key: string, value?: string | number | boolean) => {
  if (value !== undefined && value !== '') params.set(key, String(value));
};

export const clearRequestCache = () => {
  responseCache.clear();
  pendingRequests.forEach(request => request.controller.abort());
  pendingRequests.clear();
};

export const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

export const loginUser = async (
  serverUrl: string,
  username: string,
  password?: string,
  signal?: AbortSignal,
): Promise<AuthResponse> => {
  const response = await fetch(`${cleanUrl(serverUrl)}/Users/AuthenticateByName`, {
    method: 'POST',
    headers: getHeaders(undefined, true),
    body: JSON.stringify({ Username: username, Pw: password || '' }),
    signal,
  });

  if (!response.ok) throw new Error('Authentication failed');
  return response.json();
};

export const logoutUser = async (serverUrl: string, token: string) => {
  try {
    await fetch(`${cleanUrl(serverUrl)}/Sessions/Logout`, {
      method: 'POST',
      headers: getHeaders(token),
      keepalive: true,
    });
  } finally {
    clearRequestCache();
  }
};

export const getUserViews = async (
  serverUrl: string,
  userId: string,
  token: string,
  signal?: AbortSignal,
): Promise<LibraryView[]> => {
  const params = new URLSearchParams({ userId });
  const data = await requestJson<{ Items?: LibraryView[] }>(
    `${cleanUrl(serverUrl)}/UserViews?${params}`,
    token,
    `views:${userId}`,
    CACHE_TTL.userViews,
    signal,
  );
  return data.Items || [];
};

export const getItems = async (
  serverUrl: string,
  userId: string,
  token: string,
  query: ItemQuery & { StartIndex?: number; Limit?: number },
  signal?: AbortSignal,
): Promise<{ items: BaseItem[]; total: number }> => {
  const params = new URLSearchParams({
    userId,
    enableUserData: 'true',
    enableTotalRecordCount: query.StartIndex === 0 ? 'true' : 'false',
    imageTypeLimit: '1',
    fields: ['OriginalTitle', 'ChildCount', 'RecursiveItemCount', 'Taglines', 'Genres'].join(','),
  });

  appendIfPresent(params, 'sortBy', query.SortBy);
  appendIfPresent(params, 'sortOrder', query.SortOrder);
  appendIfPresent(params, 'includeItemTypes', query.IncludeItemTypes?.join(','));
  appendIfPresent(params, 'recursive', query.Recursive ?? true);
  appendIfPresent(params, 'parentId', query.ParentId);
  appendIfPresent(params, 'searchTerm', query.SearchTerm?.trim());
  appendIfPresent(params, 'genreIds', query.GenreIds);
  appendIfPresent(params, 'tags', query.Tags);
  appendIfPresent(params, 'years', query.Years);
  appendIfPresent(params, 'isPlayed', query.IsPlayed);
  appendIfPresent(params, 'startIndex', query.StartIndex);
  appendIfPresent(params, 'limit', query.Limit);

  const url = `${cleanUrl(serverUrl)}/Items?${params}`;
  const data = await requestJson<{ Items?: BaseItem[]; TotalRecordCount?: number }>(
    url,
    token,
    `items:${userId}`,
    CACHE_TTL.items,
    signal,
  );

  return {
    items: data.Items || [],
    total: data.TotalRecordCount || 0,
  };
};

export const getRandomItem = async (
  serverUrl: string,
  userId: string,
  token: string,
  query: {
    parentId?: string;
    excludePlayed?: boolean;
    includeItemTypes?: Array<'Movie' | 'Series'>;
    searchTerm?: string;
    tags?: string[];
  } = {},
  signal?: AbortSignal,
): Promise<BaseItem | null> => {
  const params = new URLSearchParams({
    userId,
    sortBy: 'Random',
    limit: '1',
    recursive: 'true',
    enableUserData: 'true',
    enableTotalRecordCount: 'false',
    includeItemTypes: query.includeItemTypes?.join(',') || 'Movie,Series',
    fields: 'Overview,ProviderIds,Taglines,Tags',
  });

  appendIfPresent(params, 'parentId', query.parentId);
  appendIfPresent(params, 'isPlayed', query.excludePlayed ? false : undefined);
  appendIfPresent(params, 'searchTerm', query.searchTerm?.trim());
  appendIfPresent(params, 'tags', query.tags?.join('|'));

  const data = await requestJson<{ Items?: BaseItem[] }>(
    `${cleanUrl(serverUrl)}/Items?${params}`,
    token,
    `random:${userId}:${Date.now()}`,
    0,
    signal,
  );
  return data.Items?.[0] || null;
};

export const getItemTags = async (
  serverUrl: string,
  userId: string,
  token: string,
  parentId?: string,
  includeItemTypes: Array<'Movie' | 'Series'> = ['Movie', 'Series'],
  signal?: AbortSignal,
): Promise<string[]> => {
  const params = new URLSearchParams({
    userId,
    includeItemTypes: includeItemTypes.join(','),
    recursive: 'true',
  });
  appendIfPresent(params, 'parentId', parentId);

  const data = await requestJson<{ Tags?: string[] }>(
    `${cleanUrl(serverUrl)}/Items/Filters2?${params}`,
    token,
    `filters:${userId}`,
    CACHE_TTL.filters,
    signal,
  );
  return data.Tags || [];
};

export const getGenres = async (
  serverUrl: string,
  userId: string,
  token: string,
  parentId?: string,
  signal?: AbortSignal,
): Promise<FilterOption[]> => {
  const params = new URLSearchParams({
    userId,
    enableTotalRecordCount: 'false',
  });
  appendIfPresent(params, 'parentId', parentId);

  const data = await requestJson<{ Items?: FilterOption[] }>(
    `${cleanUrl(serverUrl)}/Genres?${params}`,
    token,
    `genres:${userId}`,
    CACHE_TTL.genres,
    signal,
  );
  return data.Items || [];
};

export const getItemDetails = (
  serverUrl: string,
  userId: string,
  token: string,
  itemId: string,
  signal?: AbortSignal,
): Promise<BaseItem> => {
  const params = new URLSearchParams({
    userId,
    fields: ['Overview', 'People', 'ProviderIds', 'Chapters', 'Path', 'MediaStreams', 'Genres', 'Taglines', 'Tags'].join(','),
  });

  return requestJson<BaseItem>(
    `${cleanUrl(serverUrl)}/Items/${itemId}?${params}`,
    token,
    `details:${userId}`,
    CACHE_TTL.itemDetails,
    signal,
  );
};

export const getSeasons = async (
  serverUrl: string,
  userId: string,
  token: string,
  seriesId: string,
  signal?: AbortSignal,
): Promise<BaseItem[]> => {
  const params = new URLSearchParams({
    userId,
    fields: 'ChildCount',
    enableUserData: 'true',
    enableImages: 'false',
  });

  const data = await requestJson<{ Items?: BaseItem[] }>(
    `${cleanUrl(serverUrl)}/Shows/${seriesId}/Seasons?${params}`,
    token,
    `seasons:${userId}`,
    CACHE_TTL.seasons,
    signal,
  );
  return data.Items || [];
};

export const getImageUrl = (
  serverUrl: string,
  itemId: string,
  tag?: string,
  type: 'Primary' | 'Backdrop' = 'Primary',
  width?: number,
  quality = 75,
) => {
  if (!tag) return '';

  const params = new URLSearchParams({ tag, format: 'webp', quality: String(quality) });
  appendIfPresent(params, 'width', width);
  return `${cleanUrl(serverUrl)}/Items/${itemId}/Images/${type}?${params}`;
};

export const getUserImageUrl = (serverUrl: string, userId: string, tag?: string) => {
  if (!tag) return null;
  const params = new URLSearchParams({ userId, tag, format: 'webp' });
  return `${cleanUrl(serverUrl)}/UserImage?${params}`;
};

export const fetchTmdbDetails = <T = any>(
  type: 'movie' | 'tv',
  tmdbId: string,
  signal?: AbortSignal,
): Promise<T> => {
  const params = new URLSearchParams({
    language: import.meta.env.APP_LANGUAGE || 'fr',
    append_to_response: 'external_ids,credits,videos,watch/providers',
  });

  return requestJson<T>(
    `/tmdb/${type}/${tmdbId}?${params}`,
    undefined,
    'tmdb',
    CACHE_TTL.tmdb,
    signal,
    false,
  );
};
