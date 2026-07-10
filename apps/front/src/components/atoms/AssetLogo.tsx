'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Building2 } from 'lucide-react';

interface AssetLogoProps {
  ticker: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

export function AssetLogo({ ticker, size = 'md', className = '' }: AssetLogoProps) {
  const [hasError, setHasError] = useState(false);
  const dimension = sizeMap[size];

  // Brapi icons URL pattern
  const logoUrl = `https://icons.brapi.dev/icons/${ticker.toUpperCase()}.svg`;

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-muted ${className}`}
        style={{ width: dimension, height: dimension }}
      >
        <Building2 className="text-muted-foreground" style={{ width: dimension * 0.5, height: dimension * 0.5 }} />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-white ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      <Image
        src={logoUrl}
        alt={`Logo ${ticker}`}
        width={dimension}
        height={dimension}
        className="object-contain p-1"
        onError={() => setHasError(true)}
        unoptimized
      />
    </div>
  );
}
