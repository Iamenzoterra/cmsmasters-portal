import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

// Colors stay as Tailwind classes (hsl(var()) works fine)
// Sizing uses inline styles (bare --var syntax broken in TW v4)
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap font-medium',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        // Figma: fills=general/primary, text=general/primary foreground
        primary: [
          'bg-[hsl(var(--primary))]',
          'text-[hsl(var(--primary-foreground))]',
          'hover:bg-[hsl(var(--primary-hover))]',
          'focus-visible:ring-[hsl(var(--primary))]',
        ],
        // Figma: fills=general/secondary, text=general/secondary foreground
        secondary: [
          'bg-[hsl(var(--secondary))]',
          'text-[hsl(var(--secondary-foreground))]',
          'hover:bg-[hsl(var(--secondary-hover))]',
          'focus-visible:ring-[hsl(var(--secondary))]',
        ],
        // Figma: fills=unofficial/outline, text=general/foreground, strokes=unofficial/border 3
        outline: [
          'border border-[hsl(var(--border))]',
          'text-[hsl(var(--foreground))]',
          'bg-[hsl(var(--outline))]',
          'hover:bg-[hsl(var(--outline-hover)/0.03)]',
          'focus-visible:ring-[hsl(var(--border))]',
        ],
        // Figma: fills=unofficial/ghost (transparent), text=unofficial/ghost foreground
        ghost: [
          'text-[hsl(var(--ghost-foreground))]',
          'bg-transparent',
          'hover:bg-[hsl(var(--ghost-hover)/0.05)]',
          'focus-visible:ring-[hsl(var(--ring))]',
        ],
        // Figma: fills=general/destructive, text=general/destructive foreground
        destructive: [
          'bg-[hsl(var(--destructive))]',
          'text-[hsl(var(--destructive-foreground))]',
          'hover:bg-[hsl(var(--destructive)/0.9)]',
          'focus-visible:ring-[hsl(var(--destructive))]',
        ],
        // Portal DS branded CTA
        cta: [
          'bg-[hsl(var(--button-cta-bg))]',
          'text-[hsl(var(--button-cta-fg))]',
          'hover:bg-[hsl(var(--button-cta-bg)/0.85)]',
          'focus-visible:ring-[hsl(var(--button-cta-bg))]',
        ],
      },
      roundness: {
        default: '',
        pill: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      roundness: 'default',
    },
  },
);

// All sizing applied via inline styles — Tailwind v4 bare var syntax is broken
const SIZE_STYLES: Record<string, React.CSSProperties> = {
  mini: {
    height: 'var(--button-height-mini)',
    paddingLeft: 'var(--button-padding-x-mini)',
    paddingRight: 'var(--button-padding-x-mini)',
    paddingTop: 'var(--button-padding-y-mini)',
    paddingBottom: 'var(--button-padding-y-mini)',
    fontSize: 'var(--button-font-size-mini)',
    lineHeight: 'var(--button-line-height-mini)',
    gap: 'var(--button-gap-sm)',
  },
  sm: {
    height: 'var(--button-height-sm)',
    paddingLeft: 'var(--button-padding-x-sm)',
    paddingRight: 'var(--button-padding-x-sm)',
    paddingTop: 'var(--button-padding-y-sm)',
    paddingBottom: 'var(--button-padding-y-sm)',
    fontSize: 'var(--button-font-size)',
    lineHeight: 'var(--button-line-height)',
    gap: 'var(--button-gap-sm)',
  },
  default: {
    height: 'var(--button-height-default)',
    paddingLeft: 'var(--button-padding-x-default)',
    paddingRight: 'var(--button-padding-x-default)',
    paddingTop: 'var(--button-padding-y-default)',
    paddingBottom: 'var(--button-padding-y-default)',
    fontSize: 'var(--button-font-size)',
    lineHeight: 'var(--button-line-height)',
    gap: 'var(--button-gap)',
  },
  lg: {
    height: 'var(--button-height-lg)',
    paddingLeft: 'var(--button-padding-x-lg)',
    paddingRight: 'var(--button-padding-x-lg)',
    paddingTop: 'var(--button-padding-y-lg)',
    paddingBottom: 'var(--button-padding-y-lg)',
    fontSize: 'var(--button-font-size)',
    lineHeight: 'var(--button-line-height)',
    gap: 'var(--button-gap)',
  },
  xl: {
    height: 'var(--button-height-xl)',
    paddingLeft: 'var(--button-padding-x-xl)',
    paddingRight: 'var(--button-padding-x-xl)',
    paddingTop: 'var(--button-padding-y-xl)',
    paddingBottom: 'var(--button-padding-y-xl)',
    fontSize: 'var(--button-font-size-xl)',
    lineHeight: 'var(--button-line-height-xl)',
    gap: 'var(--button-gap)',
  },
};

const ROUNDNESS_STYLES: Record<string, React.CSSProperties> = {
  default: { borderRadius: 'var(--button-radius)' },
  pill: { borderRadius: 'var(--button-radius-pill)' },
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    size?: 'mini' | 'sm' | 'default' | 'lg' | 'xl' | null;
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
    const roundnessKey = roundness ?? 'default';

    const tokenStyle: React.CSSProperties = {
      ...(SIZE_STYLES[sizeKey] ?? SIZE_STYLES.default),
      ...(ROUNDNESS_STYLES[roundnessKey] ?? ROUNDNESS_STYLES.default),
      ...style,
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, roundness, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        style={tokenStyle}
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
