'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../theme/utils';
import { Card } from '../ui/Card';
import { getRelativeTime } from '../lib/utils';

export interface ComponentEntry {
  id: string;
  name: string;
  layer: 'primitives' | 'domain' | 'layouts';
  hasStory: boolean;
  hasTests: boolean;
  usedBy: string[];
  loc: number;
  lastModified: string;
}

interface ComponentCardProps {
  component: ComponentEntry;
  onClick?: (component: ComponentEntry) => void;
}

export function ComponentCard({ component, onClick }: ComponentCardProps): React.JSX.Element {
  return (
    <Card
      className={cn(onClick && 'cursor-pointer')}
      onClick={onClick ? () => onClick(component) : undefined}
    >
      <div className="flex flex-col gap-2">
        <div>
          <p className="font-bold text-text-primary text-sm">{component.name}</p>
          <p className="text-xs text-text-muted capitalize">{component.layer}</p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-secondary w-10">Story</span>
            {component.hasStory ? (
              <CheckCircle size={14} className="text-status-success" />
            ) : (
              <XCircle size={14} className="text-text-muted" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-secondary w-10">Test</span>
            {component.hasTests ? (
              <CheckCircle size={14} className="text-status-success" />
            ) : (
              <XCircle size={14} className="text-text-muted" />
            )}
          </div>
        </div>

        {component.usedBy.length > 0 && (
          <p className="text-text-secondary text-xs">
            <span className="text-text-muted">Used by: </span>
            {component.usedBy.join(', ')}
          </p>
        )}

        <div className="flex items-center gap-1.5 font-mono text-xs text-text-muted pt-1 border-t border-zinc-800">
          <span>{component.loc} lines</span>
          <span>·</span>
          <span>{getRelativeTime(component.lastModified)}</span>
        </div>
      </div>
    </Card>
  );
}
