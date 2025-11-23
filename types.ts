export interface User {
  Id: string;
  Name: string;
  Token?: string;
  PrimaryImageTag?: string;
}

export interface AuthResponse {
  User: User;
  AccessToken: string;
  ServerId: string;
}

export interface Person {
  Name: string;
  Id: string;
  Role: string;
  Type: string;
  PrimaryImageTag?: string;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface BaseItem {
  Name: string;
  ServerId?: string;
  Id: string;
  Type: 'Movie' | 'Series' | 'Episode' | 'Collection' | 'BoxSet' | 'Season' | string;
  ProductionYear?: number;
  PremiereDate?: string;
  Overview?: string;
  OriginalTitle?: string;
  RunTimeTicks?: number;
  CommunityRating?: number;
  Taglines?: string[];
  Tags?: string[];
  Genres?: string[];
  ImageTags?: {
    Primary?: string;
    Backdrop?: string;
    Logo?: string;
  };
  BackdropImageTags?: string[];
  SeriesId?: string;
  SeriesName?: string;
  SeasonId?: string;
  SeasonName?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  ChildCount?: number;
  RecursiveItemCount?: number;
  People?: Person[];
  ProviderIds?: {
    Tmdb?: string;
    Imdb?: string;
  };
  UserData?: {
      Played?: boolean;
      UnplayedItemCount?: number;
      PlaybackPositionTicks?: number;
  }
}

export interface LibraryView {
  Id: string;
  Name: string;
  CollectionType: string;
  ImageTags?: {
      Primary?: string;
  }
}

export interface ItemQuery {
  ParentId?: string;
  SortBy?: string;
  SortOrder?: 'Ascending' | 'Descending';
  IncludeItemTypes?: string[];
  Recursive?: boolean;
  Fields?: string[];
  SearchTerm?: string;
  GenreIds?: string;
  Tags?: string;
  Years?: string;
  IsPlayed?: boolean;
}

export interface FilterOption {
    Id: string;
    Name: string;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

