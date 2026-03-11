import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../theme/utils';

type CardProps = ComponentPropsWithoutRef<'div'>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface-card border border-zinc-800 rounded-card p-card',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
