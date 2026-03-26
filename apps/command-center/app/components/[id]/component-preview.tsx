'use client';

import type React from 'react';
import { Button } from '@cmsmasters/ui';

const VARIANTS = ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'cta'] as const;
const SIZES = ['mini', 'sm', 'default', 'lg', 'xl'] as const;

function ButtonPreview(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6">
      {/* Variant × Size matrix */}
      <div className="flex flex-col gap-3">
        {VARIANTS.map((v) => (
          <div key={v} className="flex items-center gap-2 flex-wrap">
            <span className="w-20 text-xs font-mono text-zinc-400 shrink-0">{v}</span>
            {SIZES.map((s) => (
              <Button key={`${v}-${s}`} variant={v} size={s}>
                {s}
              </Button>
            ))}
          </div>
        ))}
      </div>

      {/* Roundness */}
      <div className="flex items-center gap-3 pt-3 border-t border-zinc-200">
        <span className="text-xs font-mono text-zinc-400">pill</span>
        <Button roundness="pill" size="lg">Pill Primary</Button>
        <Button variant="outline" roundness="pill" size="lg">Pill Outline</Button>
        <Button variant="cta" roundness="pill" size="lg">Pill CTA</Button>
      </div>

      {/* States */}
      <div className="flex items-center gap-3 pt-3 border-t border-zinc-200">
        <span className="text-xs font-mono text-zinc-400">states</span>
        <Button>Default</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </div>
    </div>
  );
}

// Registry: componentId → preview renderer
const PREVIEW_REGISTRY: Record<string, () => React.ReactElement> = {
  'ui-primitives-button': ButtonPreview,
};

export function ComponentPreview({ componentId }: { componentId: string }): React.ReactElement | null {
  const Preview = PREVIEW_REGISTRY[componentId];
  if (!Preview) return null;
  return <Preview />;
}

/**
 * Forces light-mode token values inside CC's dark theme.
 * CC has `.dark` class on <html> which overrides :root CSS vars.
 * This wrapper re-applies the :root (light) values so portal
 * components preview correctly.
 */
const LIGHT_MODE_OVERRIDES: React.CSSProperties & Record<string, string> = {
  /* shadcn core — from tokens.css :root */
  '--primary': '0 0% 5%',
  '--primary-foreground': '22 22% 97%',
  '--primary-hover': '0 0% 23%',
  '--secondary': '30 20% 94%',
  '--secondary-foreground': '0 0% 5%',
  '--secondary-hover': '22 22% 97%',
  '--foreground': '0 0% 0%',
  '--accent': '30 20% 94%',
  '--accent-foreground': '0 0% 5%',
  '--destructive': '0 72% 51%',
  '--destructive-foreground': '0 0% 100%',
  '--border': '30 20% 90%',
  '--ring': '0 0% 87%',
  '--ring-error': '0 94% 82%',
  /* unofficial — from tokens.css :root */
  '--outline': '0 0% 100%',
  '--outline-hover': '0 0% 0%',
  '--ghost': '0 0% 100%',
  '--ghost-foreground': '0 0% 23%',
  '--ghost-hover': '0 0% 0%',
  '--border-3': '0 0% 87%',
  '--border-4': '37 12% 62%',
  /* portal brand — same in light/dark */
  '--button-cta-bg': '206 100% 92%',
  '--button-cta-fg': '235 67% 29%',
};

export function LightModeWrapper({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="bg-white p-8 min-h-[200px]" style={LIGHT_MODE_OVERRIDES}>
      {children}
    </div>
  );
}
