import React, { useEffect, useState } from 'react';
import { BaseItem, Person, WatchProvider, Video } from '../types';
import { getImageUrl, fetchTmdbDetails, getSeasons, getItemDetails } from '../services/jellyfinService';
import { X, Play, Star, Calendar, Clock, Users, Tv, Globe, Clapperboard, Link as LinkIcon, ExternalLink, Youtube, Tag } from 'lucide-react';
import { t, currentLang } from '../src/i18n'; 

interface MediaModalProps {
  item: BaseItem | null;
  serverUrl: string;
  onClose: () => void;
  tmdbApiKey?: string;
}

const formatTicks = (ticks: number) => {
  const totalMinutes = Math.round(ticks / 10000000 / 60);
  if (totalMinutes <= 0) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const normalizeName = (name?: string) => {
    if (!name) return "";
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const getLanguageName = (code: string) => {
    try {
        const regionNames = new Intl.DisplayNames([currentLang], { type: 'language' });
        const name = regionNames.of(code);
        if(name) return name.charAt(0).toUpperCase() + name.slice(1);
    } catch (e) {}
    return code.toUpperCase();
}

export const MediaModal: React.FC<MediaModalProps> = ({ item: initialItem, serverUrl, onClose, tmdbApiKey }) => {
  const [fullItem, setFullItem] = useState<BaseItem | null>(initialItem);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [tmdbData, setTmdbData] = useState<any>(null);
  const [seasons, setSeasons] = useState<BaseItem[]>([]);
  const [actors, setActors] = useState<Person[]>([]);
  const [directors, setDirectors] = useState<Person[]>([]);
  const [providers, setProviders] = useState<WatchProvider[]>([]);
  const [trailer, setTrailer] = useState<Video | null>(null);
  const [personIdMap, setPersonIdMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!initialItem) { setFullItem(null); return; }
    setFullItem(initialItem);
    setTmdbData(null);
    setSeasons([]);
    setActors([]); 
    setDirectors([]);
    setProviders([]);
    setTrailer(null);
    setPersonIdMap({});
    setLoadingDetails(true);

    const userStr = localStorage.getItem('jellyfin_user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (user) {
      getItemDetails(serverUrl, user.Id, user.Token, initialItem.Id)
        .then(details => {
          if (details) {
            setFullItem(details);
            const people = details.People || [];
            setActors(people.filter(p => p.Type === 'Actor').slice(0, 15));
            const dirs = people.filter(p => p.Type === 'Director');
            const crew = people.filter(p => ['Producer', 'Writer', 'Creator'].includes(p.Type));
            setDirectors(dirs.length > 0 ? dirs : crew.slice(0, 3));

            if (details.Type === 'Series') {
              getSeasons(serverUrl, user.Id, user.Token, details.Id).then(setSeasons).catch(console.warn);
            }

            if (details.ProviderIds?.Tmdb) {
              const type = details.Type === 'Series' ? 'tv' : 'movie';
              fetchTmdbDetails("", type, details.ProviderIds.Tmdb)
                .then(data => {
                  if (data) {
                    setTmdbData(data);
                    const region = currentLang.toUpperCase(); 
                    const watchData = data['watch/providers']?.results?.[region] || data['watch/providers']?.results?.['US'];
                    if (watchData?.flatrate) setProviders(watchData.flatrate);

                    if (data.videos?.results) {
                        const vids = data.videos.results;
                        const officialTrailer = vids.find((v: any) => v.type === "Trailer" && v.site === "YouTube" && v.official);
                        const anyTrailer = vids.find((v: any) => v.type === "Trailer" && v.site === "YouTube");
                        setTrailer(officialTrailer || anyTrailer || null);
                    }

                    const map: Record<string, number> = {};
                    const processCredits = (list: any[]) => list?.forEach((c: any) => {
                        if (c.name && c.id) map[normalizeName(c.name)] = c.id;
                    });
                    if (data.created_by) processCredits(data.created_by);
                    if (data.credits) { processCredits(data.credits.cast); processCredits(data.credits.crew); }
                    setPersonIdMap(map);
                  }
                })
                .catch(console.warn);
            }
          }
        })
        .finally(() => setLoadingDetails(false));
    }
  }, [initialItem, serverUrl]);

  if (!fullItem) return null;

  const backdropUrl = fullItem.BackdropImageTags?.[0] ? getImageUrl(serverUrl, fullItem.Id, fullItem.BackdropImageTags[0], 'Backdrop', 1280) : null;
  const posterUrl = getImageUrl(serverUrl, fullItem.Id, fullItem.ImageTags?.Primary, 'Primary', 400) + "&quality=90&format=webp";
  const year = fullItem.ProductionYear || 'N/A';
  const description = fullItem.Overview || tmdbData?.overview || '...';
  
  const avgEpisodeTicks = fullItem.RunTimeTicks || 0;
  const totalEpisodes = fullItem.RecursiveItemCount || 0;
  let durationDisplay = '';
  if (fullItem.Type === 'Series') {
    const totalTicks = avgEpisodeTicks * totalEpisodes;
    if (totalTicks > 0) durationDisplay = formatTicks(totalTicks);
  } else {
    if (avgEpisodeTicks > 0) durationDisplay = formatTicks(avgEpisodeTicks);
  }

  const langCode = tmdbData?.original_language;
  const langDisplay = langCode ? getLanguageName(langCode) : null;
  const tmdbId = fullItem.ProviderIds?.Tmdb;
  const imdbId = tmdbData?.external_ids?.imdb_id || fullItem.ProviderIds?.Imdb;
  const homepage = tmdbData?.homepage;
  const tmdbType = fullItem.Type === 'Series' ? 'tv' : 'movie';

  const handlePlay = () => window.open(`${serverUrl.replace(/\/$/, '')}/web/index.html#!/details?id=${fullItem.Id}`, '_blank');
  const getPersonLink = (name: string) => {
    const id = personIdMap[normalizeName(name)];
    return id ? `https://www.themoviedb.org/person/${id}` : `https://www.themoviedb.org/search/person?query=${encodeURIComponent(name)}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#181818] rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-gray-800 flex flex-col" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/60 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"><X size={24}/></button>

        <div className="relative h-48 md:h-80 w-full shrink-0">
          {backdropUrl ? (
            <>
              <img src={backdropUrl} alt="Backdrop" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent"></div>
            </>
          ) : <div className="w-full h-full bg-gradient-to-br from-jellyfin-accent to-purple-900" />}
          <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
            <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg pr-12">{fullItem.Name}</h1>
            {fullItem.Taglines && fullItem.Taglines.length > 0 && <p className="text-gray-300 text-lg md:text-xl mt-2 italic font-light opacity-90">"{fullItem.Taglines[0]}"</p>}
            {fullItem.OriginalTitle && fullItem.OriginalTitle !== fullItem.Name && <p className="text-gray-400 text-xs md:text-sm mt-1 opacity-80">{fullItem.OriginalTitle}</p>}
          </div>
        </div>

        <div className="p-6 md:p-8 grid md:grid-cols-[250px_1fr] gap-8 overflow-x-hidden">
          <div className="hidden md:block shrink-0">
            <img src={posterUrl} className="rounded-lg shadow-lg w-full object-cover aspect-[2/3]" alt="Poster" />
            <button onClick={handlePlay} className="mt-4 w-full bg-jellyfin-accent hover:bg-jellyfin-hover text-white px-4 py-3 rounded font-bold flex items-center justify-center transition-colors shadow-lg"><Play fill="currentColor" className="mr-2" size={20} /> {t('play')}</button>
            {trailer && (<a href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noreferrer" className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold flex items-center justify-center transition-colors shadow-lg text-sm"><Youtube className="mr-2" size={20} /> {t('trailer')}</a>)}
            <div className="flex justify-center gap-3 mt-6 flex-wrap items-center">
              {homepage && <a href={homepage} target="_blank" rel="noreferrer" title={t('official_site')} className="text-gray-400 hover:text-white p-2 bg-gray-800 rounded-full"><LinkIcon size={20} /></a>}
              {tmdbId && <a href={`https://www.themoviedb.org/${tmdbType}/${tmdbId}`} target="_blank" rel="noreferrer"><img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg" className="w-8 h-8" alt="TMDB"/></a>}
              {imdbId && <a href={`https://www.imdb.com/title/${imdbId}`} target="_blank" rel="noreferrer"><img src="https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg" className="w-8 h-8" alt="IMDB"/></a>}
            </div>
            {providers.length > 0 && (
                <div className="mt-6 border-t border-gray-800 pt-4">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 text-center mb-3">{t('streaming')}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {providers.map(p => (
                            <a key={p.provider_id} href={`https://www.themoviedb.org/${tmdbType}/${tmdbId}/watch`} target="_blank" rel="noreferrer" title={`${t('view_on')} ${p.provider_name}`} className="relative group hover:scale-110 transition-transform">
                                <img src={`https://image.tmdb.org/t/p/original${p.logo_path}`} alt={p.provider_name} className="w-10 h-10 rounded-lg shadow-md" />
                            </a>
                        ))}
                    </div>
                </div>
            )}
          </div>

          <div className="space-y-6 min-w-0">
            <div className="flex flex-wrap gap-3 items-center text-xs md:text-sm text-gray-300">
              <span className="flex items-center bg-gray-800 px-3 py-1 rounded-full border border-gray-700" title={t('production_year')}><Calendar size={14} className="mr-2 text-jellyfin-accent" /> {year}</span>
              {durationDisplay && <span className="flex items-center bg-gray-800 px-3 py-1 rounded-full border border-gray-700" title={t('duration')}><Clock size={14} className="mr-2 text-jellyfin-accent" /> {durationDisplay}</span>}
              {fullItem.CommunityRating && <span className="flex items-center bg-gray-800 px-3 py-1 rounded-full border border-gray-700" title={t('community_rating')}><Star size={14} className="mr-2 text-yellow-500" fill="currentColor" /> {fullItem.CommunityRating.toFixed(1)}</span>}
              {langDisplay && <span className="flex items-center bg-gray-800 px-3 py-1 rounded-full border border-gray-700" title={t('original_lang')}><Globe size={14} className="mr-2 text-blue-400" /> {langDisplay}</span>}
            </div>

            {directors.length > 0 && (
              <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm items-baseline">
                <span className="text-gray-400 flex-shrink-0"><Clapperboard size={14} className="inline mr-1" /> {fullItem.Type === 'Series' ? t('creator') : t('director')} :</span>
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {directors.map((d, i) => (
                    <a key={d.Id} href={getPersonLink(d.Name)} target="_blank" rel="noreferrer" className="text-white font-medium hover:text-jellyfin-accent hover:underline">{d.Name}{i < directors.length - 1 ? ', ' : ''}</a>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('synopsis')}</h3>
              {loadingDetails && !fullItem.Overview ? <div className="animate-pulse h-20 bg-gray-800 rounded"></div> : <p className="text-gray-300 leading-relaxed text-sm md:text-base">{description}</p>}
            </div>

            {fullItem.Type === 'Series' && seasons.length > 0 && (
              <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                <h4 className="font-semibold text-jellyfin-accent mb-3 flex items-center"><Tv size={16} className="mr-2" /> {t('seasons')} ({fullItem.ChildCount})</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                    {seasons.map(s => (
                        <div key={s.Id} className="bg-gray-800 p-2 rounded text-xs flex justify-between text-white hover:bg-gray-700 cursor-default">
                            <span className="truncate">{s.Name}</span><span className="text-gray-400">{s.ChildCount} {t('episodes')}</span>
                        </div>
                    ))}
                </div>
              </div>
            )}

            {actors.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center"><Users size={18} className="mr-2" /> {t('cast')}</h3>
                <div className="flex gap-3 overflow-x-auto pb-4 w-full scrollbar-thin">
                  {actors.map(person => (
                    <a key={person.Id} href={getPersonLink(person.Name)} target="_blank" rel="noreferrer" className="w-20 md:w-24 shrink-0 text-center group block">
                      <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-2 rounded-full overflow-hidden bg-gray-800 border-2 border-transparent group-hover:border-jellyfin-accent transition-all relative">
                        {person.PrimaryImageTag ? <img src={getImageUrl(serverUrl, person.Id, person.PrimaryImageTag, 'Primary', 150)} className="w-full h-full object-cover" alt={person.Name} loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No IMG</div>}
                      </div>
                      <p className="text-xs font-medium text-white truncate group-hover:text-jellyfin-accent">{person.Name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{person.Role}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {fullItem.Tags && fullItem.Tags.length > 0 && (
                <div className="pt-4 border-t border-gray-800">
                    <h4 className="text-sm font-bold text-gray-400 mb-3 flex items-center"><Tag size={16} className="mr-2" /> Tags</h4>
                    <div className="flex flex-wrap gap-2">
                        {fullItem.Tags.map(tag => (<span key={tag} className="px-3 py-1 bg-gray-800 text-gray-300 text-xs rounded-full border border-gray-700 cursor-default hover:border-gray-500">{tag}</span>))}
                    </div>
                </div>
            )}
            
            <div className="md:hidden pt-4 flex flex-col gap-3">
                <button onClick={handlePlay} className="w-full bg-jellyfin-accent hover:bg-jellyfin-hover text-white px-6 py-3 rounded font-bold flex items-center justify-center"><Play fill="currentColor" className="mr-2" /> {t('play')}</button>
                {trailer && (<a href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noreferrer" className="w-full bg-red-600 text-white px-4 py-2 rounded font-bold flex items-center justify-center text-sm"><Youtube className="mr-2" size={20} /> {t('trailer')}</a>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
