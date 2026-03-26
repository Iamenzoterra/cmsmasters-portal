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

  if (!Preview) {
    return null;
  }

  return <Preview />;
}
