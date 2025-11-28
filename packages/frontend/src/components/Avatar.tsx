'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-16 h-16 text-base',
  lg: 'w-24 h-24 text-xl',
  xl: 'w-32 h-32 text-2xl',
};

export function Avatar({ src, alt, size = 'md', fallback, className = '' }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  const showFallback = !src || imageError;
  const fallbackText = fallback || alt.charAt(0).toUpperCase();

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center ${sizeClasses[size]} ${className}`}
    >
      {showFallback ? (
        <span className="font-bold text-white">{fallbackText}</span>
      ) : (
        <>
          {loading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            onLoad={() => setLoading(false)}
            onError={() => {
              setImageError(true);
              setLoading(false);
            }}
            sizes={size === 'xl' ? '128px' : size === 'lg' ? '96px' : size === 'md' ? '64px' : '40px'}
          />
        </>
      )}
    </div>
  );
}
