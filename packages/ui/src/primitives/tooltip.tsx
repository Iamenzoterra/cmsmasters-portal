// WP-037 Phase 2 — Tooltip primitive (first in Portal DS).
//
// Underpinning: @radix-ui/react-tooltip.
// Specs distilled from UX Architect + UI Designer agents (logs/wp-037/).
//
// Trigger: any focusable child (typically a <button>). Pass via `asChild` on
// `TooltipTrigger` (compound API) or `<Tooltip content={...}>{trigger}</Tooltip>`
// (convenience wrapper).
//
// Visual:
// - Surface: --popover / --popover-foreground (intentionally inverted vs body
//   background — dark popover on light body for high hover-distinct contrast,
//   matches GitHub / Linear / Figma idiom).
// - 240px max-width. rounded-md (6px). shadow-md.
// - Padding: --spacing-xs (8px) X / --spacing-2xs (4px) Y.
// - Typography: --text-xs-font-size / --text-xs-line-height.
// - Arrow: rendered by default (matches surface fill).
//
// Behavior:
// - delayDuration: 400ms (faster than Radix default 700 for power-user
//   authoring tools where users scan many properties).
// - skipDelayDuration: 150ms (default — fast successive hovers across rows
//   skip re-delay).
// - Position: side="right", align="start" — Inspector labels are left-aligned
//   in a vertical sidebar; right tip avoids covering the input control.
// - Keyboard: focus opens; Esc dismisses (Radix defaults).
// - Mobile: long-press fallback (Radix default — Inspector is desktop-only).
//
// Animations: plain Tailwind transitions via data-[state=*] selectors (no
// tailwindcss-animate plugin — matches drawer pattern).

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '../lib/utils'

/**
 * Wrap your app once near the React tree root. Coordinates `skipDelayDuration`
 * across all Tooltips so rapid hover across rows skips the open-delay.
 *
 *   <TooltipProvider>
 *     <App />
 *   </TooltipProvider>
 *
 * Defaults (DS-level): `delayDuration={400}`, `skipDelayDuration={150}`.
 */
export interface TooltipProviderProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider> {}

export function TooltipProvider({
  delayDuration = 400,
  skipDelayDuration = 150,
  ...rest
}: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...rest}
    />
  )
}

/** Compound API — use for rich content or non-default positioning. */
export const TooltipRoot = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger
export const TooltipPortal = TooltipPrimitive.Portal

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 max-w-[240px] rounded-md',
      'bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))]',
      'px-[var(--spacing-xs)] py-[var(--spacing-2xs)]',
      'text-[length:var(--text-xs-font-size)] leading-[var(--text-xs-line-height)]',
      'shadow-[var(--shadow-md)]',
      'transition-opacity duration-150',
      'data-[state=delayed-open]:opacity-100 data-[state=closed]:opacity-0',
      'data-[state=instant-open]:opacity-100',
      className,
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export const TooltipArrow = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Arrow
    ref={ref}
    width={10}
    height={5}
    className={cn('fill-[hsl(var(--popover))]', className)}
    {...props}
  />
))
TooltipArrow.displayName = TooltipPrimitive.Arrow.displayName

/**
 * Convenience wrapper for the 90% case: hint text + single trigger child.
 *
 *   <Tooltip content="Direction flex items flow along the main axis…">
 *     <button type="button">flex-direction</button>
 *   </Tooltip>
 *
 * When `content` is null / undefined / empty string / false, returns the child
 * unwrapped (no Radix machinery) — avoids an empty popover for properties
 * that have no metadata.
 */
export interface TooltipProps {
  /** Hint text or rich content. When falsy, returns children unwrapped. */
  content?: React.ReactNode
  /** Single focusable child — passed via Radix `asChild`. */
  children: React.ReactElement
  /** Side. Default 'right' — Inspector labels are left-aligned, right tip avoids covering content. */
  side?: TooltipPrimitive.TooltipContentProps['side']
  /** Alignment along the chosen side. Default 'start'. */
  align?: TooltipPrimitive.TooltipContentProps['align']
  /** Open delay in ms — overrides the Provider default 400ms. */
  delayDuration?: number
  /** Render with arrow indicator. Default true. */
  showArrow?: boolean
}

export function Tooltip({
  content,
  children,
  side = 'right',
  align = 'start',
  delayDuration,
  showArrow = true,
}: TooltipProps) {
  // Empty-content escape — render the trigger as if no Tooltip were here.
  if (content == null || content === '' || content === false) {
    return children
  }
  return (
    <TooltipRoot delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipPortal>
        <TooltipContent side={side} align={align}>
          {content}
          {showArrow && <TooltipArrow />}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  )
}
