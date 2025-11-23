import { AuthResponse, BaseItem, ItemQuery, LibraryView } from '../types';

const HEADERS = {
  'Content-Type': 'application/json',
  'X-Emby-Authorization': 'MediaBrowser Client="ReactClient", Device="Web", DeviceId="react-web-client", Version="1.0.0"',
};

const cleanUrl = (url: string) => url.replace(/\/$/, '');

export const loginUser = async (serverUrl: string, username: string, password?: string): Promise<AuthResponse> => {
  const url = `${cleanUrl(serverUrl)}/Users/AuthenticateByName`;
  const body = { Username: username, Pw: password || '' };
  const response = await fetch(url, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  if (!response.ok) throw new Error('Authentication failed');
  return response.json();
};

export const getUserViews = async (serverUrl: string, userId: string, token: string): Promise<LibraryView[]> => {
  const url = `${cleanUrl(serverUrl)}/Users/${userId}/Views?Fields=PrimaryImageAspectRatio,SortName,PartnerTypes`;
  const response = await fetch(url, { headers: { ...HEADERS, 'X-Emby-Token': token } });
  if (!response.ok) throw new Error('Failed to fetch views');
  const data = await response.json();
  return data.Items || [];
};

export const getItems = async (
  serverUrl: string, 
  userId: string, 
  token: string, 
  query: ItemQuery & { StartIndex?: number; Limit?: number }
): Promise<{ items: BaseItem[], total: number }> => {
  const params = new URLSearchParams();
  
  params.append('EnableUserData', 'true'); 
  params.append('EnableTotalRecordCount', 'true');
  params.append('ImageTypeLimit', '1');
  
  if (query.SortBy) params.append('SortBy', query.SortBy);
  if (query.SortOrder) params.append('SortOrder', query.SortOrder);
  if (query.IncludeItemTypes) params.append('IncludeItemTypes', query.IncludeItemTypes.join(','));
  
  if (query.Recursive) params.append('Recursive', 'true');
  
  if (query.ParentId) params.append('ParentId', query.ParentId);

  if (query.SearchTerm && query.SearchTerm.trim() !== '') params.append('SearchTerm', query.SearchTerm);
  if (query.GenreIds) params.append('GenreIds', query.GenreIds);
  if (query.Tags) params.append('Tags', query.Tags);
  if (query.Years) params.append('Years', query.Years);
  
  if (query.IsPlayed === true) {
      params.append('Filters', 'IsPlayed');
  } else if (query.IsPlayed === false) {
      params.append('Filters', 'IsUnplayed');
  }

  const fields = ['OriginalTitle', 'ProductionYear', 'PremiereDate', 'RunTimeTicks', 'ChildCount', 'RecursiveItemCount', 'CommunityRating', 'Taglines', 'Genres', 'UserData'];
  params.append('Fields', fields.join(','));
  
  if (query.StartIndex !== undefined) params.append('StartIndex', query.StartIndex.toString());
  if (query.Limit !== undefined) params.append('Limit', query.Limit.toString());

  const url = `${cleanUrl(serverUrl)}/Users/${userId}/Items?${params.toString()}`;

  console.log(`[JellyService] Fetching: ${url}`);

  const response = await fetch(url, { headers: { ...HEADERS, 'X-Emby-Token': token } });
  if (!response.ok) throw new Error('Failed to fetch items');
  const data = await response.json();
  
  return { 
      items: data.Items || [], 
      total: data.TotalRecordCount || 0 
  };
};

export const getRandomItem = async (serverUrl: string, userId: string, token: string, parentId?: string, excludePlayed: boolean = false): Promise<BaseItem | null> => {
    const params = new URLSearchParams();
    params.append('SortBy', 'Random');
    params.append('Limit', '1');
    params.append('Recursive', 'true');
    params.append('EnableUserData', 'true'); 
    params.append('IncludeItemTypes', 'Movie,Series');
    params.append('Fields', 'Overview,People,ProviderIds,Chapters,Path,MediaStreams,Genres,ProductionYear,PremiereDate,Taglines,Tags,UserData');
    
    if (parentId) params.append('ParentId', parentId);
    if (excludePlayed) params.append('Filters', 'IsUnplayed');

    const url = `${cleanUrl(serverUrl)}/Users/${userId}/Items?${params.toString()}`;
    
    try {
        const response = await fetch(url, { headers: { ...HEADERS, 'X-Emby-Token': token } });
        if (!response.ok) return null;
        const data = await response.json();
        return data.Items && data.Items.length > 0 ? data.Items[0] : null;
    } catch (e) {
        console.error("Random fetch error", e);
        return null;
    }
};

export const getGenres = async (serverUrl: string, userId: string, token: string, parentId?: string) => {
    const urlFilters = `${cleanUrl(serverUrl)}/Genres?ParentId=${parentId || ''}&Recursive=true`;
    const response = await fetch(urlFilters, { headers: { ...HEADERS, 'X-Emby-Token': token } });
    if (!response.ok) return [];
    const data = await response.json();
    return data.Items || [];
};

export const getItemDetails = async (serverUrl: string, userId: string, token: string, itemId: string): Promise<BaseItem> => {
    const url = `${cleanUrl(serverUrl)}/Users/${userId}/Items/${itemId}?Fields=Overview,People,ProviderIds,Chapters,Path,MediaStreams,Genres,ProductionYear,PremiereDate,Taglines,Tags,UserData`;
    const response = await fetch(url, { headers: { ...HEADERS, 'X-Emby-Token': token } });
    if(!response.ok) throw new Error("Failed to fetch details");
    return response.json();
}

export const getSeasons = async (serverUrl: string, userId: string, token: string, seriesId: string): Promise<BaseItem[]> => {
    const url = `${cleanUrl(serverUrl)}/Users/${userId}/Items?ParentId=${seriesId}&IncludeItemTypes=Season&SortBy=ParentIndexNumber&SortOrder=Ascending&Fields=ChildCount,UserData`;
    const response = await fetch(url, { headers: { ...HEADERS, 'X-Emby-Token': token } });
    if(!response.ok) throw new Error("Failed to fetch seasons");
    const data = await response.json();
    return data.Items || [];
};

export const getImageUrl = (serverUrl: string, itemId: string, tag?: string, type: 'Primary' | 'Backdrop' = 'Primary', width?: number) => {
  if (!tag) return 'https://picsum.photos/300/450';
  const w = width ? `&width=${width}` : '';
  return `${cleanUrl(serverUrl)}/Items/${itemId}/Images/${type}?tag=${tag}${w}&format=webp&quality=60`;
};

export const getUserImageUrl = (serverUrl: string, userId: string, tag?: string, width: number = 100) => {
    if (!tag) return null;
    return `${cleanUrl(serverUrl)}/Users/${userId}/Images/Primary?tag=${tag}&width=${width}&quality=60&format=webp`;
};

export const fetchTmdbDetails = async (ignoredApiKey: string | undefined, type: 'movie' | 'tv', tmdbId: string) => {
    const appLang = import.meta.env.VITE_APP_LANGUAGE || 'fr';
    try {
        const url = `/tmdb/${type}/${tmdbId}?language=${appLang}&append_to_response=external_ids,credits,videos,watch/providers`;
        const res = await fetch(url);
        if(res.ok) return await res.json();
    } catch (e) {
        console.warn("TMDB Fetch Error", e);
    }
    return null;
}
