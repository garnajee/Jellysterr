import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MemoryRouter, Routes, Route, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { loginUser, getUserViews, getItems, getImageUrl, getUserImageUrl, getGenres, getRandomItem } from './services/jellyfinService';
import { User, LibraryView, BaseItem, FilterOption } from './types';
import { MediaCard } from './components/MediaCard';
import { MediaModal } from './components/MediaModal';
import { LogOut, LayoutGrid, List as ListIcon, Server, Film, Search, Filter, X, Check, Eye, EyeOff, Dice5 } from 'lucide-react';
import { t } from './src/i18n'; 

const getEnv = (key: string) => {
  const meta = import.meta as any;
  if (meta && meta.env) { return meta.env[key] || ''; }
  return '';
};

const ENV_SERVER_URL = getEnv('VITE_JELLYFIN_URL');
const ENV_TMDB_KEY = ""; 

// --- Login Page ---
const LoginPage: React.FC<{ onLogin: (u: User, url: string) => void }> = ({ onLogin }) => {
  const [server, setServer] = useState(() => {
      const cached = localStorage.getItem('jellyfin_url');
      return cached && cached !== "undefined" ? cached : ENV_SERVER_URL;
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let finalServerUrl = server.replace(/\/$/, '');
      if (!finalServerUrl) {
          if (window.location.protocol.startsWith('http')) finalServerUrl = window.location.origin;
          else throw new Error(t('server_url') + " requis");
      }
      if (!finalServerUrl.startsWith('http')) finalServerUrl = `http://${finalServerUrl}`;

      const response = await loginUser(finalServerUrl, username, password);
      const user: User = { ...response.User, Token: response.AccessToken };
      onLogin(user, finalServerUrl);
    } catch (err: any) {
      console.error(err);
      setError(t('login_error') || 'Connexion échouée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=2531&auto=format&fit=crop')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-black/70"></div>
      <div className="relative bg-black/80 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-800 backdrop-blur-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-jellyfin-accent mb-2">{t('app_name')}</h1>
          <p className="text-gray-400 text-sm">{t('login_title')}</p>
        </div>
        {error && <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4 text-sm border border-red-500/30">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={server} onChange={e => setServer(e.target.value)} placeholder={t('server_url')} className="w-full bg-[#333] border border-gray-600 rounded p-2 text-white focus:border-jellyfin-accent outline-none"/>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder={t('username')} className="w-full bg-[#333] border border-gray-600 rounded p-2 text-white focus:border-jellyfin-accent outline-none"/>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('password')} className="w-full bg-[#333] border border-gray-600 rounded p-2 text-white focus:border-jellyfin-accent outline-none"/>
          <button type="submit" disabled={loading} className="w-full bg-jellyfin-accent hover:bg-jellyfin-hover text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50">{loading ? t('loading') : t('connect_btn')}</button>
        </form>
      </div>
    </div>
  );
};

// --- Layout ---
const DashboardLayout: React.FC<{ user: User; serverUrl: string; onLogout: () => void; onSearch: (term: string) => void; children: React.ReactNode }> = ({ user, onLogout, onSearch, children, serverUrl }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchTerm(val);
      onSearch(val);
  };

  const userImageUrl = user.PrimaryImageTag ? getUserImageUrl(serverUrl, user.Id, user.PrimaryImageTag, 100) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#101010] text-white">
      <header className="bg-[#141414] border-b border-gray-800 sticky top-0 z-40 shadow-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center cursor-pointer shrink-0" onClick={() => {setSearchTerm(''); onSearch(''); navigate('/');}}>
            <Film className="text-jellyfin-accent mr-2" />
            <span className="text-xl font-bold tracking-wide hidden md:block">JELLYSTERR</span>
          </div>
          <div className="flex-grow max-w-xl relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={18} className="text-gray-500"/></div>
              <input type="text" value={searchTerm} onChange={handleSearchChange} placeholder={t('search_placeholder')} className="w-full bg-[#2a2a2a] text-white border border-gray-700 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-jellyfin-accent transition-colors"/>
              {searchTerm && <button onClick={() => {setSearchTerm(''); onSearch('');}} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white"><X size={16}/></button>}
          </div>
          <div className="flex items-center gap-4 shrink-0">
             {userImageUrl ? (
                 <img src={userImageUrl} alt={user.Name} className="w-8 h-8 rounded-full object-cover border border-gray-700" loading="eager" />
             ) : (
                 <div className="w-8 h-8 rounded-full bg-jellyfin-accent flex items-center justify-center font-bold text-sm">{user.Name.charAt(0).toUpperCase()}</div>
             )}
            <button onClick={onLogout} className="text-gray-400 hover:text-white" title={t('logout')}><LogOut size={20} /></button>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

// --- Library List ---
const LibraryList: React.FC<{ user: User; serverUrl: string }> = ({ user, serverUrl }) => {
  const [views, setViews] = useState<LibraryView[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if(user.Token) {
        getUserViews(serverUrl, user.Id, user.Token).then(setViews).catch(console.error);
    }
  }, [user, serverUrl]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 border-l-4 border-jellyfin-accent pl-3">{t('my_libraries')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {views
            .filter(view => view.CollectionType !== 'boxsets')
            .map(view => {
                const imageUrl = view.ImageTags?.Primary ? getImageUrl(serverUrl, view.Id, view.ImageTags.Primary, 'Primary', 400) : null;
                return (
                <div key={view.Id} onClick={() => navigate(`/library/${view.Id}?name=${encodeURIComponent(view.Name)}`)} className="bg-jellyfin-card hover:bg-[#2a2a2a] rounded-lg cursor-pointer transition-all hover:scale-105 border border-gray-800 hover:border-jellyfin-accent group shadow-lg overflow-hidden relative h-40">
                    {imageUrl ? (
                        <div className="h-full w-full relative">
                            <img src={imageUrl} alt={view.Name} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"/>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-4 w-full"><h3 className="font-bold text-xl text-white drop-shadow-md flex items-center"><Server size={18} className="mr-2 text-jellyfin-accent" /> {view.Name}</h3></div>
                        </div>
                    ) : (
                        <div className="p-6 flex flex-col items-center justify-center h-full"><Server size={48} className="text-gray-600 mb-2 group-hover:text-jellyfin-accent transition-colors" /><h3 className="text-center font-bold text-lg">{view.Name}</h3></div>
                    )}
                </div>
                );
            })}
      </div>
    </div>
  );
};

// --- Main Content ---
const LibraryContent: React.FC<{ user: User; serverUrl: string; globalSearchTerm: string; }> = ({ user, serverUrl, globalSearchTerm }) => {
    const { id: libraryId } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const libName = searchParams.get('name') || 'Recherche';

    const [items, setItems] = useState<BaseItem[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedItem, setSelectedItem] = useState<BaseItem | null>(null);
    
    const [showFilters, setShowFilters] = useState(false);
    const [genres, setGenres] = useState<FilterOption[]>([]);
    const [selectedGenre, setSelectedGenre] = useState<string>("");
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [playStatus, setPlayStatus] = useState<boolean | null>(null);
    
    const [randomLoading, setRandomLoading] = useState(false);
    const [excludePlayedRandom, setExcludePlayedRandom] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [startIndex, setStartIndex] = useState(0);
    const LIMIT = 50;

    const observer = useRef<IntersectionObserver>();
    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) setStartIndex(prev => prev + LIMIT);
        });
        if (node) observer.current.observe(node);
    }, [isLoading, hasMore]);

    useEffect(() => {
        if (libraryId && user.Token && !globalSearchTerm) getGenres(serverUrl, user.Id, user.Token, libraryId).then(setGenres).catch(() => {});
        else setGenres([]);
    }, [libraryId, user, serverUrl, globalSearchTerm]);

    useEffect(() => {
        setItems([]);
        setStartIndex(0);
        setHasMore(true);
        setTotalCount(0);
    }, [libraryId, globalSearchTerm, selectedGenre, selectedYear, playStatus]);

    useEffect(() => {
        if (!user.Token) return;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await getItems(serverUrl, user.Id, user.Token, {
                    ParentId: globalSearchTerm ? undefined : libraryId,
                    SearchTerm: globalSearchTerm || undefined,
                    SortBy: 'SortName',
                    SortOrder: 'Ascending',
                    Recursive: !!globalSearchTerm, 
                    IncludeItemTypes: ['Movie', 'Series'],
                    GenreIds: selectedGenre || undefined,
                    Years: selectedYear || undefined,
                    IsPlayed: playStatus === null ? undefined : playStatus,
                    StartIndex: startIndex,
                    Limit: LIMIT
                });

                let newItems = response.items;
                
                if (playStatus === false) {
                    newItems = newItems.filter(item => !item.UserData?.Played);
                }

                if (startIndex === 0) setTotalCount(response.total);

                if (response.items.length < LIMIT) setHasMore(false);
                setItems(prev => startIndex === 0 ? newItems : [...prev, ...newItems]);
            } catch (e) { console.error(e); } finally { setIsLoading(false); }
        };
        const timeout = setTimeout(() => fetchData(), 300);
        return () => clearTimeout(timeout);
    }, [startIndex, libraryId, globalSearchTerm, selectedGenre, selectedYear, playStatus, user, serverUrl]);

    const handleRandomClick = async () => {
        if (!user.Token || randomLoading) return;
        setRandomLoading(true);
        try {
            const targetLib = globalSearchTerm ? undefined : libraryId;
            const randomItem = await getRandomItem(serverUrl, user.Id, user.Token, targetLib, excludePlayedRandom);
            if (randomItem) setSelectedItem(randomItem);
            else alert(t('no_random'));
        } catch (e) { console.error(e); } finally { setRandomLoading(false); }
    };

    const years = Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => (new Date().getFullYear() - i).toString());

    return (
        <div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold flex items-center truncate max-w-full">
                    <span className="text-gray-400 mr-2">/</span> 
                    {globalSearchTerm ? `${t('search_placeholder')}: "${globalSearchTerm}"` : decodeURIComponent(libName)}
                    <span className="ml-3 text-sm font-normal text-gray-500 bg-gray-900 px-2 py-0.5 rounded-full">{totalCount}</span>
                </h2>
                
                <div className="flex flex-wrap gap-2 self-start lg:self-auto items-center">
                    <div className="flex items-center bg-gray-800 rounded p-1 border border-gray-700 mr-2">
                        <button onClick={handleRandomClick} disabled={randomLoading} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-jellyfin-accent hover:bg-jellyfin-hover text-white rounded transition-colors disabled:opacity-50">
                            {randomLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Dice5 size={18} />}
                            <span className="hidden sm:inline">{t('random')}</span>
                        </button>
                        <button onClick={() => setExcludePlayedRandom(!excludePlayedRandom)} className={`ml-1 p-1.5 rounded transition-colors ${excludePlayedRandom ? 'text-green-400 bg-green-900/30' : 'text-gray-500 hover:text-gray-300'}`} title={excludePlayedRandom ? t('random_exclude') : t('random_include')}>
                            {excludePlayedRandom ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {!globalSearchTerm && (
                        <div className="relative">
                            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors ${selectedGenre || selectedYear || playStatus !== null ? 'text-jellyfin-accent border border-jellyfin-accent' : 'text-white'}`}>
                                <Filter size={18} /> <span className="hidden sm:inline">{t('filters')}</span>
                            </button>
                            
                            {showFilters && (
                                <div className="absolute right-0 top-12 z-30 bg-[#222] border border-gray-700 p-4 rounded-lg shadow-xl w-72 max-h-[80vh] overflow-y-auto scrollbar-thin">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-sm text-white">{t('filters')}</h4>
                                        <button onClick={() => setShowFilters(false)}><X size={16} className="text-gray-500 hover:text-white"/></button>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-xs text-gray-400 mb-2 font-bold">{t('state')}</label>
                                        <div className="flex gap-2 bg-gray-800 p-1 rounded">
                                            <button onClick={() => setPlayStatus(null)} className={`flex-1 py-1 text-xs rounded ${playStatus === null ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}>{t('all')}</button>
                                            <button onClick={() => setPlayStatus(false)} className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 ${playStatus === false ? 'bg-jellyfin-accent text-white' : 'text-gray-400 hover:text-white'}`}><EyeOff size={12}/> {t('unwatched')}</button>
                                            <button onClick={() => setPlayStatus(true)} className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 ${playStatus === true ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}><Eye size={12}/> {t('watched')}</button>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-xs text-gray-400 mb-2 font-bold">{t('year')}</label>
                                        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full bg-gray-800 text-white text-sm rounded p-2 border border-gray-700 outline-none">
                                            <option value="">{t('all_years')}</option>
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-2 font-bold">{t('genres')}</label>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={() => setSelectedGenre("")} className={`px-2 py-1 text-xs rounded border ${!selectedGenre ? 'bg-jellyfin-accent border-transparent text-white' : 'border-gray-600 text-gray-300 hover:border-white'}`}>{t('all')}</button>
                                            {genres.map(g => (
                                                <button key={g.Id} onClick={() => setSelectedGenre(g.Id)} className={`px-2 py-1 text-xs rounded border ${selectedGenre === g.Id ? 'bg-jellyfin-accent border-transparent text-white' : 'border-gray-600 text-gray-300 hover:border-white'}`}>{g.Name}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex bg-gray-800 rounded p-1 border border-gray-700">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}><LayoutGrid size={20} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}><ListIcon size={20} /></button>
                    </div>
                </div>
            </div>

            <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4" : "flex flex-col gap-2"}>
                {items.map((item, index) => {
                    if (items.length === index + 1) {
                        return <div ref={lastElementRef} key={item.Id}><MediaCard item={item} serverUrl={serverUrl} viewMode={viewMode} onClick={setSelectedItem} /></div>;
                    }
                    return <MediaCard key={item.Id} item={item} serverUrl={serverUrl} viewMode={viewMode} onClick={setSelectedItem} />;
                })}
            </div>

            {isLoading && <div className="py-12 flex justify-center w-full"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-jellyfin-accent"></div></div>}
            {!isLoading && items.length === 0 && <div className="flex flex-col items-center justify-center py-20 text-gray-500"><Film size={48} className="mb-4 opacity-20"/><p>{t('no_content')}</p></div>}

            <MediaModal item={selectedItem} serverUrl={serverUrl} onClose={() => setSelectedItem(null)} tmdbApiKey={ENV_TMDB_KEY}/>
        </div>
    );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('jellyfin_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [serverUrl, setServerUrl] = useState<string>(() => {
      const stored = localStorage.getItem('jellyfin_url');
      return stored && stored !== "undefined" ? stored : ENV_SERVER_URL;
  });
  const [searchTerm, setSearchTerm] = useState("");

  const handleLogin = (u: User, url: string) => {
    setUser(u);
    setServerUrl(url);
    localStorage.setItem('jellyfin_user', JSON.stringify(u));
    localStorage.setItem('jellyfin_url', url);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('jellyfin_user');
  };

  return (
    <MemoryRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <DashboardLayout user={user} serverUrl={serverUrl} onLogout={handleLogout} onSearch={setSearchTerm}>{searchTerm ? <LibraryContent user={user} serverUrl={serverUrl} globalSearchTerm={searchTerm} /> : <LibraryList user={user} serverUrl={serverUrl} />}</DashboardLayout> : <Navigate to="/login" />} />
        <Route path="/library/:id" element={user ? <DashboardLayout user={user} serverUrl={serverUrl} onLogout={handleLogout} onSearch={setSearchTerm}><LibraryContent user={user} serverUrl={serverUrl} globalSearchTerm={searchTerm} /></DashboardLayout> : <Navigate to="/login" />} />
      </Routes>
    </MemoryRouter>
  );
};

export default App;
