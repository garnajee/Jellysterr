import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Dice5, Eye, EyeOff, Search, SlidersHorizontal, X } from 'lucide-react';
import { BaseItem } from '../types';
import { getItemTags, getRandomItem, isAbortError } from '../services/jellyfinService';
import { currentLang, t } from '../src/i18n';

type RandomMediaType = 'all' | 'Movie' | 'Series';

interface RandomPickerProps {
  onIntent?: () => void;
  onSelect: (item: BaseItem) => void;
  parentId?: string;
  serverUrl: string;
  token: string;
  userId: string;
}

const getItemTypes = (mediaType: RandomMediaType): Array<'Movie' | 'Series'> => {
  if (mediaType === 'Movie') return ['Movie'];
  if (mediaType === 'Series') return ['Series'];
  return ['Movie', 'Series'];
};

export const RandomPicker: React.FC<RandomPickerProps> = ({
  onIntent,
  onSelect,
  parentId,
  serverUrl,
  token,
  userId,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [mediaType, setMediaType] = useState<RandomMediaType>('all');
  const [keyword, setKeyword] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [excludePlayed, setExcludePlayed] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);
  const [noResult, setNoResult] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const randomController = useRef<AbortController | null>(null);

  useEffect(() => () => randomController.current?.abort(), []);

  useEffect(() => {
    if (!showOptions || !token) return;
    const controller = new AbortController();
    setAvailableTags([]);
    setTagsLoading(true);
    getItemTags(serverUrl, userId, token, parentId, getItemTypes(mediaType), controller.signal)
      .then(tags => setAvailableTags([...tags].sort((a, b) => a.localeCompare(b, currentLang))))
      .catch(error => { if (!isAbortError(error)) console.error(error); })
      .finally(() => { if (!controller.signal.aborted) setTagsLoading(false); });
    return () => controller.abort();
  }, [mediaType, parentId, serverUrl, showOptions, token, userId]);

  useEffect(() => {
    if (!showOptions) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setShowOptions(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [showOptions]);

  const visibleTags = useMemo(() => {
    const normalizedSearch = tagSearch.trim().toLocaleLowerCase(currentLang);
    if (!normalizedSearch) return availableTags;
    return availableTags.filter(tag => tag.toLocaleLowerCase(currentLang).includes(normalizedSearch));
  }, [availableTags, tagSearch]);

  const activeFilterCount = (mediaType === 'all' ? 0 : 1)
    + (keyword.trim() ? 1 : 0)
    + selectedTags.length
    + (excludePlayed ? 1 : 0);

  const handleRandom = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!token || randomLoading) return;
    onIntent?.();
    randomController.current?.abort();
    const controller = new AbortController();
    randomController.current = controller;
    setRandomLoading(true);
    setNoResult(false);

    try {
      const randomItem = await getRandomItem(serverUrl, userId, token, {
        parentId,
        excludePlayed,
        includeItemTypes: getItemTypes(mediaType),
        searchTerm: keyword,
        tags: selectedTags,
      }, controller.signal);

      if (randomItem) {
        setShowOptions(false);
        onSelect(randomItem);
      } else {
        setNoResult(true);
        setShowOptions(true);
      }
    } catch (error) {
      if (!isAbortError(error)) console.error(error);
    } finally {
      if (!controller.signal.aborted) setRandomLoading(false);
    }
  };

  const handleMediaTypeChange = (nextType: RandomMediaType) => {
    setMediaType(nextType);
    setSelectedTags([]);
    setTagSearch('');
    setNoResult(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(current => current.includes(tag)
      ? current.filter(selectedTag => selectedTag !== tag)
      : [...current, tag]);
    setNoResult(false);
  };

  const clearFilters = () => {
    setMediaType('all');
    setKeyword('');
    setTagSearch('');
    setSelectedTags([]);
    setExcludePlayed(false);
    setNoResult(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center bg-gray-800 rounded-xl p-1 border border-gray-700">
        <button
          onClick={() => void handleRandom()}
          onMouseEnter={onIntent}
          onFocus={onIntent}
          disabled={randomLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-jellyfin-accent hover:bg-jellyfin-hover text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {randomLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Dice5 size={18} />}
          <span>{t('random')}</span>
        </button>
        <button
          onClick={() => setExcludePlayed(current => !current)}
          className={`ml-1 p-1.5 rounded-lg transition-colors ${excludePlayed ? 'text-green-400 bg-green-900/30' : 'text-gray-500 hover:text-gray-300'}`}
          title={excludePlayed ? t('random_exclude') : t('random_include')}
          aria-label={excludePlayed ? t('random_exclude') : t('random_include')}
          aria-pressed={excludePlayed}
        >
          {excludePlayed ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button
          onClick={() => { setShowOptions(current => !current); onIntent?.(); }}
          className={`relative ml-1 p-1.5 rounded-lg transition-colors ${showOptions || activeFilterCount > 0 ? 'text-jellyfin-accent bg-purple-900/30' : 'text-gray-500 hover:text-gray-300'}`}
          title={t('random_options')}
          aria-label={t('random_options')}
          aria-expanded={showOptions}
        >
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-jellyfin-accent px-1 text-[9px] leading-4 text-white">{activeFilterCount}</span>}
        </button>
      </div>

      {showOptions && (
        <form onSubmit={handleRandom} className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-gray-700 bg-[#202020] p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">{t('random_options')}</h3>
            <button type="button" onClick={() => setShowOptions(false)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-800 hover:text-white" aria-label={t('close')}><X size={18} /></button>
          </div>

          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{t('media_type')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {(['all', 'Movie', 'Series'] as RandomMediaType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleMediaTypeChange(type)}
                  className={`rounded-lg border px-2 py-2 text-xs transition-colors ${mediaType === type ? 'border-jellyfin-accent bg-purple-900/30 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'}`}
                  aria-pressed={mediaType === type}
                >
                  {type === 'all' ? t('all') : type === 'Movie' ? t('movies') : t('series')}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mb-4 block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">{t('keyword')}</span>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={keyword}
                onChange={event => { setKeyword(event.target.value); setNoResult(false); }}
                placeholder={t('random_keyword_placeholder')}
                className="w-full rounded-xl border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-jellyfin-accent"
              />
            </div>
          </label>

          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{t('tags')}</legend>
            {availableTags.length > 12 && (
              <input
                value={tagSearch}
                onChange={event => setTagSearch(event.target.value)}
                placeholder={t('filter_tags')}
                className="mb-2 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-white outline-none focus:border-jellyfin-accent"
              />
            )}
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1 scrollbar-thin">
              {tagsLoading && Array.from({ length: 6 }, (_, index) => <span key={index} className="h-7 w-16 animate-pulse rounded-full bg-gray-700" />)}
              {!tagsLoading && visibleTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${selectedTags.includes(tag) ? 'border-jellyfin-accent bg-jellyfin-accent text-white' : 'border-gray-600 text-gray-300 hover:border-jellyfin-accent hover:text-white'}`}
                  aria-pressed={selectedTags.includes(tag)}
                >
                  {tag}
                </button>
              ))}
              {!tagsLoading && visibleTags.length === 0 && <p className="text-xs text-gray-500">{t('no_tags')}</p>}
            </div>
          </fieldset>

          {noResult && <p className="mt-3 rounded-lg border border-amber-700/40 bg-amber-950/30 p-2 text-xs text-amber-300">{t('no_random')}</p>}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-700 pt-4">
            <button type="button" onClick={clearFilters} className="text-xs text-gray-400 hover:text-white">{t('clear_filters')}</button>
            <button type="submit" disabled={randomLoading} className="flex items-center gap-2 rounded-xl bg-jellyfin-accent px-4 py-2 text-sm font-semibold text-white hover:bg-jellyfin-hover disabled:opacity-50">
              <Dice5 size={16} /> {t('find_random')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
