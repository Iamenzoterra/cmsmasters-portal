import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap font-medium',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-[hsl(var(--button-primary-bg))]',
          'text-[hsl(var(--button-primary-fg))]',
          'hover:bg-[hsl(var(--button-primary-hover))]',
          'focus-visible:ring-[hsl(var(--button-primary-bg))]',
        ],
        secondary: [
          'bg-[hsl(var(--button-secondary-bg))]',
          'text-[hsl(var(--button-secondary-fg))]',
          'hover:bg-[hsl(var(--button-secondary-hover))]',
          'focus-visible:ring-[hsl(var(--button-secondary-bg))]',
        ],
        outline: [
          'border border-[hsl(var(--button-outline-border))]',
          'text-[hsl(var(--button-outline-fg))]',
          'bg-transparent',
          'hover:bg-[hsl(var(--button-outline-border)/0.08)]',
          'focus-visible:ring-[hsl(var(--button-outline-border))]',
        ],
        ghost: [
          'text-[hsl(var(--foreground))]',
          'bg-transparent',
          'hover:bg-[hsl(var(--accent))]',
          'hover:text-[hsl(var(--accent-foreground))]',
          'focus-visible:ring-[hsl(var(--ring))]',
        ],
        destructive: [
          'bg-[hsl(var(--destructive))]',
          'text-[hsl(var(--destructive-foreground))]',
          'hover:bg-[hsl(var(--destructive)/0.9)]',
          'focus-visible:ring-[hsl(var(--destructive))]',
        ],
        cta: [
          'bg-[hsl(var(--button-cta-bg))]',
          'text-[hsl(var(--button-cta-fg))]',
          'hover:bg-[hsl(var(--button-cta-bg)/0.85)]',
          'focus-visible:ring-[hsl(var(--button-cta-bg))]',
        ],
      },
      size: {
        mini: [
          'h-[var(--button-height-mini)]',
          'px-[var(--button-padding-x-mini)]',
          'py-[var(--button-padding-y-mini)]',
          'gap-[var(--button-gap-sm)]',
          'text-[length:var(--button-font-size-mini)]',
          'leading-[var(--button-line-height-mini)]',
        ],
        sm: [
          'h-[var(--button-height-sm)]',
          'px-[var(--button-padding-x-sm)]',
          'py-[var(--button-padding-y-sm)]',
          'gap-[var(--button-gap-sm)]',
          'text-[length:var(--button-font-size)]',
          'leading-[var(--button-line-height)]',
        ],
        default: [
          'h-[var(--button-height-default)]',
          'px-[var(--button-padding-x-default)]',
          'py-[var(--button-padding-y-default)]',
          'gap-[var(--button-gap)]',
          'text-[length:var(--button-font-size)]',
          'leading-[var(--button-line-height)]',
        ],
        lg: [
          'h-[var(--button-height-lg)]',
          'px-[var(--button-padding-x-lg)]',
          'py-[var(--button-padding-y-lg)]',
          'gap-[var(--button-gap)]',
          'text-[length:var(--button-font-size)]',
          'leading-[var(--button-line-height)]',
        ],
        xl: [
          'h-[var(--button-height-xl)]',
          'px-[var(--button-padding-x-xl)]',
          'py-[var(--button-padding-y-xl)]',
          'gap-[var(--button-gap)]',
          'text-[length:var(--button-font-size-xl)]',
          'leading-[var(--button-line-height-xl)]',
        ],
      },
      roundness: {
        default: 'rounded-[var(--button-radius)]',
        pill: 'rounded-[var(--button-radius-pill)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      roundness: 'default',
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      roundness,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, roundness, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin shrink-0"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="2"
            />
            <path
              d="M14 8a6 6 0 0 0-6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants, type ButtonProps };
