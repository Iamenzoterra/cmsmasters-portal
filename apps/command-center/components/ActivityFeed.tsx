'use client';

import { CheckCircle, Circle, Loader2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '../theme/utils';
import { getRelativeTime } from '../lib/utils';

export interface Task {
  id: string;
  title: string;
  status: string;
  phase?: string;
  app?: string;
  group?: string;
  description?: string;
  completedAt?: string;
  owner?: string;
  updatedAt?: string;
}

interface TaskEvent {
  taskId: string;
  taskTitle: string;
  ownerName: string;
  status: string;
  timestamp: string;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'done') {
    return <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-status-success" />;
  }
  if (status === 'in-progress') {
    return <Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-status-active animate-spin" />;
  }
  if (status === 'blocked') {
    return <Circle className="w-4 h-4 mt-0.5 flex-shrink-0 fill-current text-status-danger" />;
  }
  return <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-muted" />;
}

export function ActivityFeed({ tasks }: { tasks: Task[] }) {
  const router = useRouter();

  const feed: TaskEvent[] = tasks
    .filter((t) => t.completedAt !== undefined || t.status !== 'todo')
    .map((t) => ({
      taskId: t.id,
      taskTitle: t.title,
      ownerName: t.owner ?? 'Unassigned',
      status: t.status,
      timestamp: t.completedAt ?? t.updatedAt ?? '',
    }))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 10);

  if (feed.length === 0) {
    return (
      <p className="text-sm text-text-muted text-center py-4">No recent activity</p>
    );
  }

  return (
    <div>
      <ul className={cn('divide-y divide-border-default')}>
        {feed.map((event) => (
          <li key={event.taskId}>
            <button
              type="button"
              className={cn(
                'w-full text-left flex items-start gap-3 p-3',
                'hover:bg-surface-hover transition-colors'
              )}
              onClick={() => router.push('/phases?task=' + event.taskId)}
            >
              <StatusIcon status={event.status} />
              <span className="flex-1 flex flex-col gap-0.5 min-w-0">
                <span className="font-mono text-xs text-text-muted">{event.taskId}</span>
                <span className="text-sm text-text-primary truncate">{event.taskTitle}</span>
                <span className="text-xs text-text-secondary">{event.ownerName}</span>
              </span>
              <span className="font-mono text-xs text-text-muted whitespace-nowrap">
                {event.timestamp ? getRelativeTime(event.timestamp) : '—'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
