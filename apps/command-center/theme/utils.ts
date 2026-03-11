type ClassValue = string | number | boolean | null | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input && input !== 0) continue;

    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(nested);
    }
  }

  return classes.join(' ');
}

const STATUS_COLOR_MAP: Record<string, string> = {
  success: 'text-green-500',
  done: 'text-green-500',
  'in-progress': 'text-blue-500',
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  review: 'text-yellow-500',
  error: 'text-red-500',
  blocked: 'text-red-500',
  orchestrator: 'text-violet-500',
};

const STATUS_BG_MAP: Record<string, string> = {
  success: 'bg-green-500/10',
  done: 'bg-green-500/10',
  'in-progress': 'bg-blue-500/10',
  info: 'bg-blue-500/10',
  warning: 'bg-yellow-500/10',
  review: 'bg-yellow-500/10',
  error: 'bg-red-500/10',
  blocked: 'bg-red-500/10',
  orchestrator: 'bg-violet-500/10',
};

export function getStatusColor(status: string): string {
  return STATUS_COLOR_MAP[status] ?? 'text-zinc-400';
}

export function getStatusBg(status: string): string {
  return STATUS_BG_MAP[status] ?? 'bg-zinc-400/10';
}
