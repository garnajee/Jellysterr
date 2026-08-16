import React from 'react';
import { BaseItem } from '../types';
import { getImageUrl } from '../services/jellyfinService';
import { Calendar, Clock, Check } from 'lucide-react';
import { t } from '../src/i18n';
import { ProgressiveImage } from './ProgressiveImage';

interface MediaCardProps {
  item: BaseItem;
  serverUrl: string;
  viewMode: 'grid' | 'list';
  onClick: (item: BaseItem) => void;
  onPrefetch?: (item: BaseItem) => void;
  priority?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = React.memo(({ item, serverUrl, viewMode, onClick, onPrefetch, priority = false }) => {
  const prefetchTimer = React.useRef<number | null>(null);
  const width = viewMode === 'grid' ? 360 : 180;
  const imageUrl = getImageUrl(serverUrl, item.Id, item.ImageTags?.Primary, 'Primary', width, 72);
  
  const year = item.ProductionYear || (item.PremiereDate ? new Date(item.PremiereDate).getFullYear() : t('not_available'));
  
  const runTimeMinutes = item.RunTimeTicks ? Math.round(item.RunTimeTicks / 10000000 / 60) : 0;
  const duration = runTimeMinutes > 0 ? `${Math.floor(runTimeMinutes/60)}h ${runTimeMinutes%60}m` : '';

  const isPlayed = item.UserData?.Played || false;

  React.useEffect(() => () => {
    if (prefetchTimer.current !== null) window.clearTimeout(prefetchTimer.current);
  }, []);

  const schedulePrefetch = () => {
    if (!onPrefetch || prefetchTimer.current !== null) return;
    prefetchTimer.current = window.setTimeout(() => {
      prefetchTimer.current = null;
      onPrefetch(item);
    }, 120);
  };

  const cancelPrefetch = () => {
    if (prefetchTimer.current === null) return;
    window.clearTimeout(prefetchTimer.current);
    prefetchTimer.current = null;
  };

  if (viewMode === 'grid') {
    return (
      <div 
        onClick={() => { cancelPrefetch(); onClick(item); }}
        onMouseEnter={schedulePrefetch}
        onMouseLeave={cancelPrefetch}
        onFocus={schedulePrefetch}
        onBlur={cancelPrefetch}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick(item);
          }
        }}
        role="button"
        tabIndex={0}
        className="group relative bg-jellyfin-card rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-jellyfin-accent transition-all duration-200 hover:scale-105 shadow-lg"
      >
        <div className="aspect-[2/3] w-full relative">
            <ProgressiveImage
              src={imageUrl} 
              alt={item.Name} 
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              className="w-full h-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
            
            {/* played icon */}
            {isPlayed && (
                <div className="absolute top-2 right-2 bg-jellyfin-accent text-white rounded-full p-1 shadow-lg z-10" title={t('watched')}>
                    <Check size={14} strokeWidth={3} />
                </div>
            )}

            {/* badge number of episodes (series only) */}
             {item.Type === 'Series' && item.RecursiveItemCount && (
                <div className="absolute top-2 left-2 bg-black/70 text-[10px] px-2 py-1 rounded text-white backdrop-blur-sm font-bold border border-white/10">
                    {item.RecursiveItemCount} {t('episodes')}
                </div>
            )}
            
            {/* community score */}
            {item.CommunityRating && (
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                    {item.CommunityRating.toFixed(1)}
                </div>
            )}
        </div>
        
        <div className="p-3">
          <h3 className="font-semibold truncate text-white text-sm md:text-base" title={item.Name}>{item.Name}</h3>
          <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
            <span className="flex items-center"><Calendar size={12} className="mr-1"/> {year}</span>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div 
      onClick={() => { cancelPrefetch(); onClick(item); }}
      onMouseEnter={schedulePrefetch}
      onMouseLeave={cancelPrefetch}
      onFocus={schedulePrefetch}
      onBlur={cancelPrefetch}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick(item);
        }
      }}
      role="button"
      tabIndex={0}
      className="flex bg-jellyfin-card rounded-lg overflow-hidden cursor-pointer hover:bg-[#2a2a2a] transition-colors border border-transparent hover:border-gray-700 h-24 md:h-32 relative group"
    >
      <div className="h-full w-16 md:w-24 shrink-0 relative">
        <ProgressiveImage
          src={imageUrl} 
          alt={item.Name} 
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          className="w-full h-full object-cover"
        />
        {/* played icon */}
        {isPlayed && (
            <div className="absolute top-1 right-1 bg-jellyfin-accent text-white rounded-full p-0.5 shadow-md z-10">
                <Check size={12} strokeWidth={3} />
            </div>
        )}
      </div>
      
      <div className="p-3 flex flex-col justify-center flex-grow min-w-0">
        <div className="flex justify-between items-start">
            <h3 className="font-bold text-white text-base md:text-lg truncate pr-2">{item.Name}</h3>
            <span className="text-sm text-jellyfin-accent font-mono shrink-0">{year}</span>
        </div>
        {item.OriginalTitle && item.OriginalTitle !== item.Name && (
            <p className="text-xs text-gray-500 italic mb-1 truncate">{item.OriginalTitle}</p>
        )}
        <div className="flex items-center gap-4 text-xs md:text-sm text-gray-400 mt-1">
           {duration && <span className="flex items-center"><Clock size={14} className="mr-1"/> {duration}</span>}
           {item.Type === 'Series' && <span>{item.ChildCount} {t('seasons')} • {item.RecursiveItemCount} {t('episodes')}</span>}
        </div>
      </div>
    </div>
  );
});
