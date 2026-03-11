'use client';

import { useState, useEffect } from 'react';
import { cn } from '../theme/utils';

interface ProgressBarProps {
  value: number;
  onClick?: () => void;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, onClick, className, showLabel = true }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const [animatedWidth, setAnimatedWidth] = useState<number>(0);

  useEffect(() => {
    setAnimatedWidth(clamped);
  }, [clamped]);

  const fillColor =
    clamped < 25
      ? 'bg-red-500'
      : clamped < 50
        ? 'bg-yellow-500'
        : clamped < 75
          ? 'bg-blue-500'
          : 'bg-green-500';

  return (
    <div
      className={cn('flex items-center gap-2', onClick && 'cursor-pointer', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      title={`${clamped}%`}
      onClick={onClick}
    >
      <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fillColor)}
          style={{ width: `${animatedWidth}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-mono text-xs text-text-secondary shrink-0">{clamped}%</span>
      )}
    </div>
  );
}
