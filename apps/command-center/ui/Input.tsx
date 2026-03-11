'use client';

import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '../theme/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="flex flex-col gap-1">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full rounded-md px-3 py-2',
            'bg-zinc-900 border border-zinc-700 text-zinc-100',
            'placeholder:text-zinc-500',
            'focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
