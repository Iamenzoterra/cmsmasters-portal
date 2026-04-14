'use client';

import Link from 'next/link';
import { cn } from '../theme/utils';

type AppStatus = 'not-started' | 'in-progress' | 'beta' | 'live';

interface AppCardApp {
  id: string;
  name: string;
  description: string;
  status: AppStatus;
  href: string;
}

interface AppCardProps {
  app: AppCardApp;
}

const STATUS_CONFIG: Record<AppStatus, { dot: string; label: string }> = {
  'not-started': { dot: 'bg-zinc-500', label: 'Not Started' },
  'in-progress': { dot: 'bg-blue-500', label: 'In Progress' },
  beta: { dot: 'bg-green-500', label: 'Beta' },
  live: { dot: 'bg-purple-500', label: 'Live' },
};

export function AppCard({ app }: AppCardProps) {
  const { dot, label } = STATUS_CONFIG[app.status];

  return (
    <Link href={app.href} className="block">
      <div
        className={cn(
          'bg-surface-card border border-zinc-800 rounded-card p-card',
          'transition-all duration-200 ease-out',
          'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40',
          'cursor-pointer'
        )}
      >
        <p className="font-bold text-text-primary truncate">{app.name}</p>
        <p className="text-sm text-text-secondary truncate mt-1">{app.description}</p>
        <div className="flex items-center gap-1.5 mt-3">
          <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
          <span className="text-xs text-text-secondary">{label}</span>
        </div>
      </div>
    </Link>
  );
}
