'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  /** Cor do brilho que segue o mouse (rgba). */
  spotlightColor?: string;
  disabled?: boolean;
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(59, 130, 246, 0.35)',
  disabled = false,
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || disabled) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn('relative rounded-2xl ring-1 ring-white/10', className)}
      style={
        {
          '--spotlight-x': `${position.x}px`,
          '--spotlight-y': `${position.y}px`,
        } as React.CSSProperties
      }
    >
      {!disabled && (
        <>
          <div
            className="absolute -inset-px pointer-events-none rounded-[inherit]"
            style={{
              background: `radial-gradient(400px 400px at var(--spotlight-x, 0px) var(--spotlight-y, 0px), ${spotlightColor}, transparent 70%)`,
            }}
          />
          <div className="absolute inset-0 rounded-[inherit] pointer-events-none bg-slate-900/90" />
        </>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
