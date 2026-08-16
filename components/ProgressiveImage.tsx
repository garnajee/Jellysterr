import React, { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ProgressiveImageProps {
  alt: string;
  className?: string;
  decoding?: 'async' | 'auto' | 'sync';
  fetchPriority?: 'high' | 'low' | 'auto';
  loading?: 'eager' | 'lazy';
  src?: string | null;
}

const SKELETON_GRADIENTS = [
  'from-violet-950 via-purple-800 to-fuchsia-900',
  'from-sky-950 via-cyan-800 to-teal-900',
  'from-rose-950 via-red-800 to-orange-900',
  'from-indigo-950 via-blue-800 to-violet-900',
  'from-emerald-950 via-green-800 to-cyan-900',
];

const getGradient = (seed: string) => {
  const hash = Array.from(seed).reduce((total, character) => total + character.charCodeAt(0), 0);
  return SKELETON_GRADIENTS[hash % SKELETON_GRADIENTS.length];
};

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  alt,
  className = '',
  decoding = 'async',
  fetchPriority = 'auto',
  loading = 'lazy',
  src,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const showSkeleton = !loaded || failed || !src;

  return (
    <>
      {showSkeleton && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${getGradient(alt)}`}
          role={!src || failed ? 'img' : undefined}
          aria-label={!src || failed ? alt : undefined}
        >
          {!failed && src && <div className="absolute inset-0 animate-pulse bg-white/10" />}
          <div className="absolute -left-1/4 top-1/4 h-1/2 w-3/4 rotate-12 rounded-full bg-white/10 blur-2xl" />
          <ImageIcon className="relative text-white/30" size={32} aria-hidden="true" />
        </div>
      )}
      {src && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding={decoding}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`${className} transition-opacity duration-300 ${loaded && !failed ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </>
  );
};
