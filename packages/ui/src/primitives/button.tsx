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
          'h-[--button-height-mini]',
          'px-[--button-padding-x-mini]',
          'py-[--button-padding-y-mini]',
        ],
        sm: [
          'h-[--button-height-sm]',
          'px-[--button-padding-x-sm]',
          'py-[--button-padding-y-sm]',
        ],
        default: [
          'h-[--button-height-default]',
          'px-[--button-padding-x-default]',
          'py-[--button-padding-y-default]',
        ],
        lg: [
          'h-[--button-height-lg]',
          'px-[--button-padding-x-lg]',
          'py-[--button-padding-y-lg]',
        ],
        xl: [
          'h-[--button-height-xl]',
          'px-[--button-padding-x-xl]',
          'py-[--button-padding-y-xl]',
        ],
      },
      roundness: {
        default: 'rounded-[--button-radius]',
        pill: 'rounded-[--button-radius-pill]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      roundness: 'default',
    },
  },
);

// Font-size, line-height, gap can't use bare CSS var syntax in Tailwind v4.
// We apply them via inline style keyed by size.
const SIZE_STYLES: Record<string, React.CSSProperties> = {
  mini: {
    fontSize: 'var(--button-font-size-mini)',
    lineHeight: 'var(--button-line-height-mini)',
    gap: 'var(--button-gap-sm)',
  },
  sm: {
    fontSize: 'var(--button-font-size)',
    lineHeight: 'var(--button-line-height)',
    gap: 'var(--button-gap-sm)',
  },
  default: {
    fontSize: 'var(--button-font-size)',
    lineHeight: 'var(--button-line-height)',
    gap: 'var(--button-gap)',
  },
  lg: {
    fontSize: 'var(--button-font-size)',
    lineHeight: 'var(--button-line-height)',
    gap: 'var(--button-gap)',
  },
  xl: {
    fontSize: 'var(--button-font-size-xl)',
    lineHeight: 'var(--button-line-height-xl)',
    gap: 'var(--button-gap)',
  },
};

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
      style,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const sizeKey = size ?? 'default';
    const sizeStyle = SIZE_STYLES[sizeKey] ?? SIZE_STYLES.default;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, roundness, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        style={{ ...sizeStyle, ...style }}
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
