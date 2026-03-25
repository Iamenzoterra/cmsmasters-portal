'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '../theme/utils';
import { ProgressBar } from '../ui/ProgressBar';

export interface PhaseBlock {
  id: string;
  name: string;
  subtitle: string;
  status: 'todo' | 'in-progress' | 'done';
  progressPct: number;
  estimatedWeeks: number;
  isCurrent?: boolean;
  href: string;
}

export interface PhaseTimelineProps {
  phases: PhaseBlock[];
  overallLabel: string;
}

function getStatusDot(status: PhaseBlock['status']): string {
  return cn(
    'w-1.5 h-1.5 rounded-full shrink-0',
    status === 'todo' && 'bg-zinc-600',
    status === 'in-progress' && 'bg-blue-500',
    status === 'done' && 'bg-green-500',
  );
}

function getCardClasses(block: PhaseBlock): string {
  return cn(
    'rounded-lg border px-3 py-2 flex flex-col gap-1.5 h-full transition-colors',
    block.status === 'done' && 'border-green-600/40 bg-surface-card',
    block.status === 'in-progress' && 'border-zinc-600 bg-surface-card',
    block.status === 'todo' && 'border-zinc-700/60 bg-surface-card',
  );
}

export function PhaseTimeline({ phases, overallLabel }: PhaseTimelineProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="font-mono text-5xl font-bold text-text-primary">{overallLabel}</p>

      <div
        className="grid w-full gap-2"
        style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(0, 1fr))` }}
      >
        {phases.map((block) => (
          <Link key={block.id} href={block.href} className="min-w-0">
            <div className={getCardClasses(block)}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={getStatusDot(block.status)} />
                <span className="text-xs font-semibold text-text-primary truncate leading-tight">
                  {block.name}
                </span>
              </div>
              <span className="text-[11px] text-text-muted font-mono">{block.subtitle}</span>
              <ProgressBar value={block.progressPct} showLabel={true} />
            </div>
            <p className="text-[10px] font-mono text-text-muted text-center mt-1">
              {block.estimatedWeeks}w
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
