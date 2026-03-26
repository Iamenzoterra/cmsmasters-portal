import { cn } from '../theme/utils';

interface StatusDotsProps {
  hasFigma?: boolean;
  hasCode: boolean;
  hasStory: boolean;
  hasTests: boolean;
  className?: string;
}

const DOTS = [
  { label: 'F', field: 'hasFigma' as const, title: 'Figma' },
  { label: 'C', field: 'hasCode' as const, title: 'Code' },
  { label: 'S', field: 'hasStory' as const, title: 'Story' },
  { label: 'T', field: 'hasTests' as const, title: 'Tests' },
];

export function StatusDots({ hasFigma = false, hasCode, hasStory, hasTests, className }: StatusDotsProps) {
  const values = { hasFigma, hasCode, hasStory, hasTests };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {DOTS.map(({ label, field, title }) => (
        <span
          key={field}
          className={cn(
            'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold',
            values[field]
              ? 'bg-status-success/20 text-status-success'
              : 'bg-zinc-700/40 text-zinc-500',
          )}
          title={`${title}: ${values[field] ? 'Yes' : 'No'}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
