'use client';

import { forwardRef, useId, useState, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../theme/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className, checked, defaultChecked, disabled, onCheckedChange, onChange, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    const isControlled = checked !== undefined;
    const [internalChecked, setInternalChecked] = useState<boolean>(defaultChecked ?? false);

    const isChecked = isControlled ? checked : internalChecked;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (!isControlled) {
        setInternalChecked(e.target.checked);
      }
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-center gap-2',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className
        )}
      >
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={isChecked}
            disabled={disabled}
            onChange={handleChange}
            className="sr-only"
            {...props}
          />
          <div
            aria-hidden="true"
            className={cn(
              'size-4 rounded-sm border transition-colors duration-100 flex items-center justify-center',
              isChecked
                ? 'bg-zinc-900 border-zinc-900'
                : 'bg-transparent border-zinc-700'
            )}
          >
            {isChecked && (
              <Check className="size-3 text-white stroke-[3]" />
            )}
          </div>
        </div>
        {label && (
          <span className="text-sm text-zinc-300 select-none">{label}</span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
