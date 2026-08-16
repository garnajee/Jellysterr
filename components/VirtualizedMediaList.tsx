import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { BaseItem } from '../types';
import { MediaCard } from './MediaCard';

interface VirtualizedMediaListProps {
  items: BaseItem[];
  onPrefetch?: (item: BaseItem) => void;
  onSelect: (item: BaseItem) => void;
  serverUrl: string;
  viewMode: 'grid' | 'list';
}

const getColumnCount = (width: number) => {
  if (width >= 1536) return 7;
  if (width >= 1280) return 6;
  if (width >= 1024) return 5;
  if (width >= 768) return 4;
  if (width >= 640) return 3;
  return 2;
};

export const VirtualizedMediaList: React.FC<VirtualizedMediaListProps> = ({
  items,
  onPrefetch,
  onSelect,
  serverUrl,
  viewMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollMargin, setScrollMargin] = useState(0);
  const columns = viewMode === 'grid' ? getColumnCount(containerWidth) : 1;
  const rowCount = Math.ceil(items.length / columns);
  const gap = viewMode === 'grid' ? 16 : 8;
  const cardWidth = columns > 0 ? Math.max(0, (containerWidth - gap * (columns - 1)) / columns) : 0;
  const estimatedRowHeight = viewMode === 'grid'
    ? Math.max(280, cardWidth * 1.5 + 72 + gap)
    : 136;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateMeasurements = () => {
      setContainerWidth(container.clientWidth);
      setScrollMargin(container.offsetTop);
    };

    updateMeasurements();
    const observer = new ResizeObserver(updateMeasurements);
    observer.observe(container);
    window.addEventListener('resize', updateMeasurements);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateMeasurements);
    };
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => estimatedRowHeight,
    overscan: 3,
    scrollMargin,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [columns, estimatedRowHeight, items.length, virtualizer, viewMode]);

  return (
    <div
      ref={containerRef}
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        position: 'relative',
        width: '100%',
      }}
    >
      {virtualizer.getVirtualItems().map(virtualRow => {
        const rowItems = items.slice(virtualRow.index * columns, (virtualRow.index + 1) * columns);

        return (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              display: 'grid',
              gap: `${gap}px`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              left: 0,
              paddingBottom: `${gap}px`,
              position: 'absolute',
              top: 0,
              transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              width: '100%',
            }}
          >
            {rowItems.map(item => (
              <MediaCard
                key={item.Id}
                item={item}
                serverUrl={serverUrl}
                viewMode={viewMode}
                onClick={onSelect}
                onPrefetch={onPrefetch}
                priority={virtualRow.index === 0}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};
