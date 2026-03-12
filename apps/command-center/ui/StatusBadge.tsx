import { cn } from '../theme/utils';

export type Status = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  tooltip: string;
}

const STATUS_MAP: Record<Status, StatusConfig> = {
  todo: {
    label: 'Todo',
    bg: 'bg-zinc-700',
    text: 'text-zinc-400',
    tooltip: 'This item has not been started yet',
  },
  'in-progress': {
    label: 'In Progress',
    bg: 'bg-blue-900',
    text: 'text-blue-400',
    tooltip: 'This item is actively being worked on',
  },
  review: {
    label: 'Review',
    bg: 'bg-yellow-900',
    text: 'text-yellow-400',
    tooltip: 'This item is awaiting review',
  },
  done: {
    label: 'Done',
    bg: 'bg-green-900',
    text: 'text-green-400',
    tooltip: 'This item has been completed',
  },
  blocked: {
    label: 'Blocked',
    bg: 'bg-red-900',
    text: 'text-red-400',
    tooltip: 'This item is blocked and cannot proceed',
  },
};

const FALLBACK_CONFIG: StatusConfig = {
  label: 'Unknown',
  bg: 'bg-zinc-700',
  text: 'text-zinc-400',
  tooltip: 'Status is unavailable or not recognized',
};

interface StatusBadgeProps {
  status?: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = (status && STATUS_MAP[status]) ?? FALLBACK_CONFIG;

  return (
    <span
      className={cn(
        'rounded-badge px-2 py-0.5',
        'text-[11px] font-bold',
        config.bg,
        config.text,
        status === 'in-progress' && 'animate-pulse',
        className
      )}
      title={config.tooltip}
    >
      {config.label}
    </span>
  );
}
