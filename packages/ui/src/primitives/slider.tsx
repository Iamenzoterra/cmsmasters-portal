import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

// Slider primitive — Radix-backed, tokens-driven.
// Colors via hsl(var(--xxx)) per no-hardcoded-styles rule.
// Track/thumb atomic dimensions use Tailwind scale (h-1, h-4, w-4) — no Figma
// Slider/* tokens shipped yet. If tokens arrive, refactor to button.tsx
// SIZE_STYLES inline-style pattern (TW v4 bare-var bug).
const sliderVariants = cva(
  ['relative flex w-full touch-none select-none items-center'],
  {
    variants: {
      size: {
        sm: 'h-4',
        default: 'h-5',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> &
  VariantProps<typeof sliderVariants>;

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, size, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(sliderVariants({ size, className }))}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-[hsl(var(--muted))]">
      <SliderPrimitive.Range className="absolute h-full bg-[hsl(var(--primary))]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        'block h-4 w-4 rounded-full border-2 bg-[hsl(var(--background))]',
        'border-[hsl(var(--primary))]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'transition-colors',
      )}
      aria-label="Slider thumb"
    />
  </SliderPrimitive.Root>
));
Slider.displayName = 'Slider';

export { Slider, sliderVariants, type SliderProps };
