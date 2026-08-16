import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearRequestCache,
  fetchTmdbDetails,
  getGenres,
  getImageUrl,
  getItemDetails,
  getItemTags,
  getItems,
  getRandomItem,
  getSeasons,
  getUserImageUrl,
  getUserViews,
} from './jellyfinService';

const SERVER_URL = 'https://jellyfin.example.test';
const TOKEN = 'test-token';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const ITEM_ID = '22222222-2222-2222-2222-222222222222';

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), {
  headers: { 'Content-Type': 'application/json' },
  status: 200,
});

describe('Jellyfin API client', () => {
  beforeEach(() => {
    clearRequestCache();
    vi.restoreAllMocks();
  });

  it('uses the modern Jellyfin 10.11 routes', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === '/Items') return Promise.resolve(jsonResponse({ Items: [], TotalRecordCount: 0 }));
      if (url.pathname === `/Items/${ITEM_ID}`) return Promise.resolve(jsonResponse({ Id: ITEM_ID, Name: 'Movie', Type: 'Movie' }));
      if (url.pathname === `/Shows/${ITEM_ID}/Seasons`) return Promise.resolve(jsonResponse({ Items: [] }));
      if (url.pathname === '/UserViews') return Promise.resolve(jsonResponse({ Items: [] }));
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await getUserViews(SERVER_URL, USER_ID, TOKEN);
    await getItems(SERVER_URL, USER_ID, TOKEN, { IncludeItemTypes: ['Movie', 'Series'], StartIndex: 0, Limit: 50 });
    await getItemDetails(SERVER_URL, USER_ID, TOKEN, ITEM_ID);
    await getSeasons(SERVER_URL, USER_ID, TOKEN, ITEM_ID);

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    expect(urls.map(url => url.pathname)).toEqual([
      '/UserViews',
      '/Items',
      `/Items/${ITEM_ID}`,
      `/Shows/${ITEM_ID}/Seasons`,
    ]);
    urls.forEach(url => expect(url.searchParams.get('userId')).toBe(USER_ID));
    expect(urls[1].searchParams.get('includeItemTypes')).toBe('Movie,Series');
    expect(urls[1].searchParams.get('enableTotalRecordCount')).toBe('true');
  });

  it('caches completed metadata requests', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse({ Items: [{ Id: 'genre', Name: 'Drama' }] })));
    vi.stubGlobal('fetch', fetchMock);

    const first = await getGenres(SERVER_URL, USER_ID, TOKEN, ITEM_ID);
    const second = await getGenres(SERVER_URL, USER_ID, TOKEN, ITEM_ID);

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses Filters2 and sends advanced random filters', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === '/Items/Filters2') return Promise.resolve(jsonResponse({ Tags: ['Family', 'Space'] }));
      if (url.pathname === '/Items') return Promise.resolve(jsonResponse({ Items: [] }));
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getItemTags(SERVER_URL, USER_ID, TOKEN, ITEM_ID, ['Movie'])).resolves.toEqual(['Family', 'Space']);
    await getRandomItem(SERVER_URL, USER_ID, TOKEN, {
      parentId: ITEM_ID,
      excludePlayed: true,
      includeItemTypes: ['Movie'],
      searchTerm: 'space',
      tags: ['Family', 'Space'],
    });

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    expect(urls[0].pathname).toBe('/Items/Filters2');
    expect(urls[0].searchParams.get('includeItemTypes')).toBe('Movie');
    expect(urls[1].searchParams.get('includeItemTypes')).toBe('Movie');
    expect(urls[1].searchParams.get('searchTerm')).toBe('space');
    expect(urls[1].searchParams.get('tags')).toBe('Family|Space');
    expect(urls[1].searchParams.get('isPlayed')).toBe('false');
  });

  it('deduplicates requests without aborting remaining consumers', async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const pendingResponse = new Promise<Response>(resolve => { resolveFetch = resolve; });
    const fetchMock = vi.fn(() => pendingResponse);
    vi.stubGlobal('fetch', fetchMock);

    const firstController = new AbortController();
    const secondController = new AbortController();
    const first = getUserViews(SERVER_URL, USER_ID, TOKEN, firstController.signal);
    const second = getUserViews(SERVER_URL, USER_ID, TOKEN, secondController.signal);

    firstController.abort();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    resolveFetch?.(jsonResponse({ Items: [{ Id: 'library', Name: 'Movies' }] }));

    await expect(second).resolves.toEqual([{ Id: 'library', Name: 'Movies' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('builds strongly cached image URLs without duplicate parameters', () => {
    const imageUrl = new URL(getImageUrl(SERVER_URL, ITEM_ID, 'image-tag', 'Primary', 400));
    const optimizedPosterUrl = new URL(getImageUrl(SERVER_URL, ITEM_ID, 'image-tag', 'Primary', 360, 72));
    const userImageUrl = new URL(getUserImageUrl(SERVER_URL, USER_ID, 'user-tag') || '');

    expect(imageUrl.pathname).toBe(`/Items/${ITEM_ID}/Images/Primary`);
    expect(imageUrl.searchParams.getAll('quality')).toEqual(['75']);
    expect(imageUrl.searchParams.getAll('format')).toEqual(['webp']);
    expect(imageUrl.searchParams.get('tag')).toBe('image-tag');
    expect(optimizedPosterUrl.searchParams.get('width')).toBe('360');
    expect(optimizedPosterUrl.searchParams.get('quality')).toBe('72');
    expect(userImageUrl.pathname).toBe('/UserImage');
    expect(userImageUrl.searchParams.get('userId')).toBe(USER_ID);
  });

  it('does not forward Jellyfin authentication headers to TMDB', async () => {
    const fetchMock = vi.fn((_input: string | URL | Request, _init?: RequestInit) => Promise.resolve(jsonResponse({ id: 550 })));
    vi.stubGlobal('fetch', fetchMock);

    await fetchTmdbDetails('movie', '550');

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.headers).toEqual({ Accept: 'application/json' });
  });
});
