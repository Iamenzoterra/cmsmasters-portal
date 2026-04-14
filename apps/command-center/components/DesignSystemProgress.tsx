'use client';

import { useRouter } from 'next/navigation';
import { cn } from '../theme/utils';
import { ProgressBar } from '../ui/ProgressBar';

type LayerName = 'Primitives' | 'Domain' | 'Layouts' | 'Infrastructure';

interface LayerRow {
  layer: LayerName;
  completed: number;
  total: number;
  href: string;
}

interface DesignSystemProgressProps {
  layers: LayerRow[] | null;
}

export function DesignSystemProgress({ layers }: DesignSystemProgressProps) {
  const router = useRouter();

  if (layers === null) {
    return (
      <div className={cn('text-sm text-text-muted')}>No components yet</div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3')}>
      {layers.map(({ layer, completed, total, href }) => {
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        return (
          <div
            key={layer}
            className={cn('flex items-center gap-3 cursor-pointer')}
            onClick={() => router.push(href)}
          >
            <span className={cn('w-24 text-text-secondary font-mono text-sm shrink-0')}>
              {layer}
            </span>
            <ProgressBar value={pct} showLabel={false} className="flex-1" />
            <span className={cn('font-mono text-xs text-text-muted w-14 text-right shrink-0')}>
              {completed}/{total}
            </span>
            <span className={cn('font-mono text-xs text-text-primary w-10 text-right shrink-0')}>
              {pct}%
            </span>
          </div>
        );
      })}
      <a
        href="http://localhost:6006"
        target="_blank"
        rel="noreferrer"
        className={cn('text-xs text-text-muted hover:text-text-secondary mt-1')}
      >
        View in Storybook
      </a>
    </div>
  );
}
