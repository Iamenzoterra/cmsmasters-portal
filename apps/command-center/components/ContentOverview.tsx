'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { cn } from '../theme/utils';
import { ProgressBar } from '../ui/ProgressBar';

export interface ContentMetrics {
  themesPublished: number;
  themesTotal: number;
  docsPublished: number;
  docsTarget: number;
  blogPosts: number;
  blogTarget: number;
}

export interface ThemeItem {
  id: string;
  name: string;
  lastUpdated: string;
}

interface ContentOverviewProps {
  metrics: ContentMetrics;
  recentThemes: ThemeItem[];
}

export function ContentOverview({ metrics, recentThemes }: ContentOverviewProps) {
  const router = useRouter();

  const handleClick = () => router.push('/content');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const themesPct =
    metrics.themesTotal > 0
      ? Math.round((metrics.themesPublished / metrics.themesTotal) * 100)
      : 0;
  const docsPct =
    metrics.docsTarget > 0
      ? Math.round((metrics.docsPublished / metrics.docsTarget) * 100)
      : 0;
  const blogPct =
    metrics.blogTarget > 0
      ? Math.round((metrics.blogPosts / metrics.blogTarget) * 100)
      : 0;

  const themeFraction =
    metrics.themesTotal === 0
      ? '—'
      : `${metrics.themesPublished}/${metrics.themesTotal}`;
  const docsFraction =
    metrics.docsTarget === 0
      ? '—'
      : `${metrics.docsPublished}/${metrics.docsTarget}`;
  const blogFraction =
    metrics.blogTarget === 0
      ? '—'
      : `${metrics.blogPosts}/${metrics.blogTarget}`;

  const visibleThemes = recentThemes.slice(0, 5);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex flex-col gap-4 cursor-pointer',
        'rounded-card p-card',
        'transition-colors duration-150'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={cn('text-xs uppercase tracking-widest text-text-muted')}>
          Content
        </span>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Themes */}
        <div className="flex flex-col gap-1">
          <span className={cn('font-mono font-bold text-4xl text-text-primary leading-none')}>
            {themeFraction}
          </span>
          <span className={cn('text-xs text-text-muted mt-1')}>Themes</span>
          <ProgressBar value={themesPct} showLabel={false} />
        </div>

        {/* Docs */}
        <div className="flex flex-col gap-1">
          <span className={cn('font-mono font-bold text-4xl text-text-primary leading-none')}>
            {docsFraction}
          </span>
          <span className={cn('text-xs text-text-muted mt-1')}>Docs</span>
          <ProgressBar value={docsPct} showLabel={false} />
        </div>

        {/* Blog Posts */}
        <div className="flex flex-col gap-1">
          <span className={cn('font-mono font-bold text-4xl text-text-primary leading-none')}>
            {blogFraction}
          </span>
          <span className={cn('text-xs text-text-muted mt-1')}>Blog Posts</span>
          <ProgressBar value={blogPct} showLabel={false} />
        </div>
      </div>

      {/* Mini list */}
      <div className={cn('border-t border-zinc-800 pt-3 flex flex-col gap-2')}>
        <span className={cn('text-xs text-text-muted')}>Recently Updated</span>
        {visibleThemes.length === 0 ? (
          <span className={cn('text-xs text-text-muted')}>No recent themes</span>
        ) : (
          visibleThemes.map((theme) => (
            <div key={theme.id} className="flex items-center justify-between gap-2">
              <span className={cn('text-sm text-text-secondary truncate')}>{theme.name}</span>
              <span className={cn('font-mono text-xs text-text-muted shrink-0')}>
                {theme.lastUpdated}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
