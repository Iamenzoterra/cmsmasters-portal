export { cn } from './src/lib/utils';
export { Badge, badgeVariants, type BadgeProps } from './src/primitives/badge';
export { Button, buttonVariants, type ButtonProps } from './src/primitives/button';
// WP-028 Phase 2 — Slider consumed by TweakPanel on both surfaces.
export { Slider, sliderVariants, type SliderProps } from './src/primitives/slider';
// WP-028 Phase 3 — Drawer consumed by VariantsDrawer on both surfaces.
export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerPortal,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from './src/primitives/drawer';
// WP-037 Phase 2 — Tooltip primitive consumed by Inspector PropertyRow on
// both surfaces (label hover hints from PROPERTY_META.tooltip).
export {
  Tooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipArrow,
  type TooltipProps,
  type TooltipProviderProps,
} from './src/primitives/tooltip';
