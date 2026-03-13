'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
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

function getStatusClasses(block: PhaseBlock): string {
  return cn(
    'border',
    block.status === 'todo' && 'border-zinc-700 bg-surface-card text-text-secondary',
    block.status === 'in-progress' && 'border-blue-500 bg-surface-card text-text-primary',
    block.status === 'done' && 'border-green-600 bg-surface-card text-text-primary',
    block.isCurrent && 'ring-2 ring-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)] scale-105'
  );
}

function getStatusDotClasses(status: PhaseBlock['status']): string {
  return cn(
    'w-2 h-2 rounded-full flex-shrink-0',
    status === 'todo' && 'bg-zinc-600',
    status === 'in-progress' && 'bg-blue-500 animate-pulse',
    status === 'done' && 'bg-green-500'
  );
}

export function PhaseTimeline({ phases, overallLabel }: PhaseTimelineProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="font-mono text-5xl font-bold text-text-primary">{overallLabel}</p>

      <div className="flex items-start w-full">
        {phases.map((block, index) => (
          <React.Fragment key={block.id}>
            <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <Link href={block.href} className="w-full">
                <div
                  className={cn(
                    'p-3 rounded-card flex flex-col gap-2 w-full cursor-pointer hover:bg-surface-hover transition-transform duration-200',
                    getStatusClasses(block)
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={getStatusDotClasses(block.status)} />
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {block.name}
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary truncate">{block.subtitle}</span>
                  <ProgressBar value={block.progressPct} showLabel={true} />
                </div>
              </Link>
              <span className="text-xs font-mono text-text-muted">{block.estimatedWeeks}w</span>
            </div>

            {index < phases.length - 1 && (
              <div className="flex-shrink-0 flex items-start self-stretch pt-3">
                <ChevronRight size={16} className="text-zinc-600" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
