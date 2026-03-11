type ClassValue = string | undefined | null | false | 0;

export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(' ');
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'done':
    case 'success':
      return 'text-green-500';
    case 'in-progress':
    case 'info':
      return 'text-blue-500';
    case 'review':
    case 'warning':
      return 'text-yellow-500';
    case 'blocked':
    case 'error':
      return 'text-red-500';
    case 'orchestrator':
      return 'text-violet-500';
    default:
      return 'text-zinc-400';
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case 'done':
    case 'success':
      return 'bg-green-500/10';
    case 'in-progress':
    case 'info':
      return 'bg-blue-500/10';
    case 'review':
    case 'warning':
      return 'bg-yellow-500/10';
    case 'blocked':
    case 'error':
      return 'bg-red-500/10';
    case 'orchestrator':
      return 'bg-violet-500/10';
    default:
      return 'bg-zinc-400/10';
  }
}
