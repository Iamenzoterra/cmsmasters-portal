import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

// Colors via Tailwind classes (hsl(var()) works fine)
// Sizing via inline styles (TW v4 bare var syntax broken)
const badgeVariants = cva(
  [
    'inline-flex items-center whitespace-nowrap font-semibold',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  ],
  {
    variants: {
      variant: {
        // Figma: fills=general/primary, text=general/primary foreground
        //        Focus effects=focus/ring
        primary: [
          'bg-[hsl(var(--primary))]',
          'text-[hsl(var(--primary-foreground))]',
          'focus-visible:ring-[hsl(var(--ring))]',
        ],
        // Figma: fills=general/secondary, text=general/secondary foreground
        secondary: [
          'bg-[hsl(var(--secondary))]',
          'text-[hsl(var(--secondary-foreground))]',
          'focus-visible:ring-[hsl(var(--ring))]',
        ],
        // Figma: fills=unofficial/outline (opacity 10%), strokes=general/border, text=general/foreground
        outline: [
          'border border-[hsl(var(--border))]',
          'bg-[hsl(var(--outline)/0.1)]',
          'text-[hsl(var(--foreground))]',
          'focus-visible:ring-[hsl(var(--ring))]',
        ],
        // Figma: fills=unofficial/ghost (opacity ~0%), text=general/foreground
        ghost: [
          'bg-[hsl(var(--ghost)/0.0001)]',
          'text-[hsl(var(--foreground))]',
          'focus-visible:ring-[hsl(var(--ring))]',
        ],
        // Figma: fills=general/destructive, text=general/primary foreground
        destructive: [
          'bg-[hsl(var(--destructive))]',
          'text-[hsl(var(--destructive-foreground))]',
          'focus-visible:ring-[hsl(var(--ring-error))]',
        ],
      },
      roundness: {
        default: '',
        round: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      roundness: 'default',
    },
  },
);

// Sizing tokens via inline styles — Figma uses general spacing tokens
// Default roundness: px=8(xs), py=2(3xs), gap=4(2xs), radius=8(rounded-lg), font-size=13(mini), line-height=16(mini), weight=semibold
// Round roundness: px=16(md), py=8(xs), gap=4(2xs), radius=9999(rounded-full), font-size=15(small), line-height=20(small), weight=regular
const ROUNDNESS_STYLES: Record<string, React.CSSProperties> = {
  default: {
    paddingLeft: 'var(--spacing-xs)',
    paddingRight: 'var(--spacing-xs)',
    paddingTop: 'var(--spacing-3xs)',
    paddingBottom: 'var(--spacing-3xs)',
    gap: 'var(--spacing-2xs)',
    borderRadius: 'var(--rounded-lg)',
    fontSize: 'var(--text-xs-font-size)',
    lineHeight: 'var(--text-xs-line-height)',
    fontWeight: 'var(--font-weight-semibold)',
  },
  round: {
    paddingLeft: 'var(--spacing-md)',
    paddingRight: 'var(--spacing-md)',
    paddingTop: 'var(--spacing-xs)',
    paddingBottom: 'var(--spacing-xs)',
    gap: 'var(--spacing-2xs)',
    borderRadius: 'var(--rounded-full)',
    fontSize: 'var(--text-sm-font-size)',
    lineHeight: 'var(--text-sm-line-height)',
    fontWeight: 'var(--font-weight-regular)',
  },
};

type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
  };

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, roundness, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    const roundnessKey = roundness ?? 'default';

    const tokenStyle: React.CSSProperties = {
      ...(ROUNDNESS_STYLES[roundnessKey] ?? ROUNDNESS_STYLES.default),
      ...style,
    };

    return (
      <Comp
        className={cn(badgeVariants({ variant, roundness, className }))}
        ref={ref}
        style={tokenStyle}
        {...props}
      />
    );
  },
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants, type BadgeProps };
