import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '../theme/utils';
import { Card } from '../ui/Card';
import type { InfraItem } from '../lib/types';

interface InfraChecklistProps {
  items: InfraItem[] | null;
}

export function InfraChecklist({ items }: InfraChecklistProps) {
  if (!items || items.length === 0) {
    return (
      <Card>
        <span className={cn('text-xs uppercase tracking-widest text-text-secondary')}>
          Infrastructure
        </span>
        <p className="mt-3 text-sm text-text-muted">No infrastructure items found.</p>
      </Card>
    );
  }

  return (
    <Card>
      <span className={cn('text-xs uppercase tracking-widest text-text-secondary')}>
        Infrastructure
      </span>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
        {items.map((item) => (
          <div
            key={item.label}
            title={item.taskTitle ?? item.label}
            className="flex items-center gap-2"
          >
            {item.done ? (
              <CheckCircle2 size={16} className="text-status-done shrink-0" />
            ) : (
              <Circle size={16} className="text-text-muted shrink-0" />
            )}
            <span className="text-sm text-text-primary">{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
