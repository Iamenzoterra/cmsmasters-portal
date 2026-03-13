import { CheckSquare, Square } from 'lucide-react';
import { cn } from '../theme/utils';
import { Card } from '../ui/Card';

export interface InfraItem {
  label: string;
  done: boolean;
  taskTitle?: string;
}

interface InfraChecklistProps {
  items: InfraItem[];
}

export function InfraChecklist({ items }: InfraChecklistProps) {
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
              <CheckSquare size={16} className="text-green-500 shrink-0" />
            ) : (
              <Square size={16} className="text-zinc-500 shrink-0" />
            )}
            <span className="text-sm text-text-primary">{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
