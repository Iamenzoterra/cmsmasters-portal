import type React from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { getComponents } from '@/lib/data';
import type { ComponentSummary, LayerName } from '@/lib/types';
import { DonutChart } from '@/ui/DonutChart';
import { cn } from '@/theme/utils';

// ─── Layer keyword buckets (mirrored from data.ts) ────────────────────────────

const INFRA_APPS = new Set(['infra', 'command-center', 'db', 'auth', 'email', 'validators', 'api-client']);
const PRIMITIVE_KEYWORDS = ['primitive', 'token', 'atom', 'color', 'font', 'spacing', 'icon'];
const DOMAIN_KEYWORDS = [
  'domain', 'button', 'badge', 'input', 'card', 'modal', 'select', 'checkbox', 'progress',
];

// ─── URL param helpers ────────────────────────────────────────────────────────

type PageParams = {
  view: string;
  sort: string;
  dir: string;
  layer: string;
  story: string;
  tests: string;
};

const DEFAULTS: PageParams = {
  view:  'grid',
  sort:  'name',
  dir:   'asc',
  layer: 'all',
  story: '0',
  tests: '0',
};

function buildHref(current: PageParams, overrides: Partial<PageParams>): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams({
    view:  merged.view,
    sort:  merged.sort,
    dir:   merged.dir,
    layer: merged.layer,
    story: merged.story,
    tests: merged.tests,
  });
  return `/components?${params.toString()}`;
}

// ─── Derivation helpers ───────────────────────────────────────────────────────

function deriveLayer(comp: ComponentSummary): LayerName {
  if (INFRA_APPS.has(comp.app)) return 'Infrastructure';
  const lower = comp.name.toLowerCase();
  if (PRIMITIVE_KEYWORDS.some((kw) => lower.includes(kw))) return 'Primitives';
  if (DOMAIN_KEYWORDS.some((kw) => lower.includes(kw))) return 'Domain';
  return 'Layouts';
}

function deriveHasStory(comp: ComponentSummary): boolean {
  return comp.status === 'done';
}

function deriveHasTests(comp: ComponentSummary): boolean {
  return comp.status === 'done';
}

type EnrichedComponent = ComponentSummary & {
  derivedLayer: LayerName;
  hasStory: boolean;
  hasTests: boolean;
};

const LAYER_ORDER: Record<LayerName, number> = { Primitives: 0, Domain: 1, Layouts: 2, Infrastructure: 3 };

const LAYER_BADGE: Record<LayerName, string> = {
  Primitives:     'bg-blue-500/20 text-blue-400',
  Domain:         'bg-purple-500/20 text-purple-400',
  Layouts:        'bg-amber-500/20 text-amber-400',
  Infrastructure: 'bg-zinc-500/20 text-zinc-400',
};

const STATUS_BADGE: Record<string, string> = {
  done:        'bg-status-success/20 text-status-success',
  'in-progress': 'bg-status-active/20 text-status-active',
  planned:     'bg-zinc-700/40 text-text-muted',
  blocked:     'bg-status-danger/20 text-status-danger',
};

// ─── TabBar ───────────────────────────────────────────────────────────────────

function TabBar({ params }: { params: PageParams }): React.ReactElement {
  const tabs = [
    { label: 'Grid View',     view: 'grid'     },
    { label: 'List View',     view: 'list'     },
    { label: 'Coverage View', view: 'coverage' },
  ];

  return (
    <div className="flex gap-1 border-b border-border mb-4">
      {tabs.map(({ label, view }) => (
        <Link
          key={view}
          href={buildHref(params, { view })}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            params.view === view
              ? 'border-b-2 border-blue-500 text-text-primary'
              : 'text-text-muted hover:text-text-secondary',
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

function FilterBar({ params }: { params: PageParams }): React.ReactElement {
  const layers: { label: string; value: string }[] = [
    { label: 'All',            value: 'all'            },
    { label: 'Primitives',     value: 'Primitives'     },
    { label: 'Domain',         value: 'Domain'         },
    { label: 'Layouts',        value: 'Layouts'        },
    { label: 'Infrastructure', value: 'Infrastructure' },
  ];

  return (
    <div className="flex flex-wrap gap-3 mb-6 items-center">
      <div className="flex gap-1">
        {layers.map(({ label, value }) => (
          <Link
            key={value}
            href={buildHref(params, { layer: value })}
            className={cn(
              'px-3 py-1 text-sm rounded-badge transition-colors',
              params.layer === value
                ? 'bg-surface-card border border-zinc-600 text-text-primary'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="flex gap-2 ml-auto">
        <Link
          href={buildHref(params, { story: params.story === '1' ? '0' : '1' })}
          className={cn(
            'px-3 py-1 text-sm rounded-badge border transition-colors',
            params.story === '1'
              ? 'bg-surface-card border-zinc-600 text-text-primary'
              : 'border-border text-text-muted hover:text-text-secondary',
          )}
        >
          Has Story
        </Link>
        <Link
          href={buildHref(params, { tests: params.tests === '1' ? '0' : '1' })}
          className={cn(
            'px-3 py-1 text-sm rounded-badge border transition-colors',
            params.tests === '1'
              ? 'bg-surface-card border-zinc-600 text-text-primary'
              : 'border-border text-text-muted hover:text-text-secondary',
          )}
        >
          Has Tests
        </Link>
      </div>
    </div>
  );
}

// ─── ComponentCard ────────────────────────────────────────────────────────────

function ComponentCard({ comp }: { comp: EnrichedComponent }): React.ReactElement {
  return (
    <div className="bg-surface-card rounded-card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-text-primary font-medium text-sm leading-tight">{comp.name}</span>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-badge font-mono shrink-0',
            STATUS_BADGE[comp.status] ?? 'bg-zinc-700/40 text-text-muted',
          )}
        >
          {comp.status}
        </span>
      </div>
      <p className="text-text-muted text-xs truncate">{comp.description}</p>
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className={cn('text-xs px-2 py-0.5 rounded-badge', LAYER_BADGE[comp.derivedLayer])}>
          {comp.derivedLayer}
        </span>
        <span className="font-mono text-xs text-text-muted">{comp.app}</span>
      </div>
    </div>
  );
}

// ─── GridView ─────────────────────────────────────────────────────────────────

function GridView({ components }: { components: EnrichedComponent[] }): React.ReactElement {
  const layers: LayerName[] = ['Primitives', 'Domain', 'Layouts', 'Infrastructure'];
  const buckets = Object.fromEntries(
    layers.map((layer) => [layer, components.filter((c) => c.derivedLayer === layer)]),
  ) as Record<LayerName, EnrichedComponent[]>;

  return (
    <div className="flex flex-col gap-8">
      {layers.map((layer) => (
        <section key={layer}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-text-primary font-semibold">{layer}</h2>
            <span className="font-mono text-xs text-text-muted bg-surface-card px-2 py-0.5 rounded-badge">
              {buckets[layer].length}
            </span>
          </div>
          {buckets[layer].length === 0 ? (
            <p className="text-text-muted italic text-sm">No components in this layer</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {buckets[layer].map((comp) => (
                <ComponentCard key={comp.id} comp={comp} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

// ─── ListView ─────────────────────────────────────────────────────────────────

function SortHeader({
  col,
  label,
  params,
}: {
  col: string;
  label: string;
  params: PageParams;
}): React.ReactElement {
  const isActive = params.sort === col;
  const nextDir = isActive && params.dir === 'asc' ? 'desc' : 'asc';
  return (
    <Link
      href={buildHref(params, { sort: col, dir: nextDir })}
      className={cn(
        'flex items-center gap-1 hover:text-text-secondary transition-colors',
        isActive ? 'text-text-primary' : 'text-text-muted',
      )}
    >
      {label}
      {isActive && (
        params.dir === 'asc'
          ? <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3" />
      )}
    </Link>
  );
}

function ListView({
  components,
  params,
}: {
  components: EnrichedComponent[];
  params: PageParams;
}): React.ReactElement {
  if (components.length === 0) {
    return <p className="text-text-muted italic text-sm">No components match the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 pr-4 font-medium">
              <SortHeader col="name" label="Name" params={params} />
            </th>
            <th className="pb-2 pr-4 font-medium">
              <SortHeader col="layer" label="Layer" params={params} />
            </th>
            <th className="pb-2 pr-4 font-medium text-text-muted">Story</th>
            <th className="pb-2 pr-4 font-medium text-text-muted">Tests</th>
            <th className="pb-2 pr-4 font-medium">
              <SortHeader col="usedBy" label="UsedBy" params={params} />
            </th>
            <th className="pb-2 font-medium text-text-muted">Modified</th>
          </tr>
        </thead>
        <tbody>
          {components.map((comp) => (
            <tr
              key={comp.id}
              className="border-b border-border/50 hover:bg-surface-hover/30 transition-colors"
            >
              <td className="py-2 pr-4 text-text-primary">{comp.name}</td>
              <td className="py-2 pr-4">
                <span className={cn('text-xs px-2 py-0.5 rounded-badge', LAYER_BADGE[comp.derivedLayer])}>
                  {comp.derivedLayer}
                </span>
              </td>
              <td className="py-2 pr-4">
                {comp.hasStory
                  ? <span className="text-status-success">✓</span>
                  : <span className="text-zinc-600">—</span>}
              </td>
              <td className="py-2 pr-4">
                {comp.hasTests
                  ? <span className="text-status-success">✓</span>
                  : <span className="text-zinc-600">—</span>}
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-text-muted">
                {comp.dependencies?.length ?? 0}
              </td>
              <td className="py-2 font-mono text-xs text-text-muted">{comp.phase}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── CoverageView ─────────────────────────────────────────────────────────────

function CoverageView({ components }: { components: EnrichedComponent[] }): React.ReactElement {
  const total = components.length;
  const storyCount = components.filter((c) => c.hasStory).length;
  const testCount  = components.filter((c) => c.hasTests).length;
  const appCount   = components.filter((c) => (c.dependencies?.length ?? 0) > 0).length;

  const storyCoverage = total > 0 ? Math.round((storyCount / total) * 100) : 0;
  const testCoverage  = total > 0 ? Math.round((testCount  / total) * 100) : 0;
  const appUsage      = total > 0 ? Math.round((appCount   / total) * 100) : 0;

  return (
    <div className="flex flex-wrap gap-8 justify-center py-8">
      <div className="flex flex-col items-center gap-2">
        <DonutChart value={storyCoverage} label="Stories" color="#3b82f6" />
        <p className="font-mono text-xs text-text-muted">{storyCount} / {total} components</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DonutChart value={testCoverage} label="Tests" color="#22c55e" />
        <p className="font-mono text-xs text-text-muted">{testCount} / {total} components</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DonutChart value={appUsage} label="App Usage" color="#f59e0b" />
        <p className="font-mono text-xs text-text-muted">{appCount} / {total} components</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}): Promise<React.ReactElement> {
  const raw = await getComponents();

  let components: ComponentSummary[] | null = null;
  if (Array.isArray(raw)) {
    components = raw;
  } else if (raw !== null && typeof raw === 'object' && 'components' in (raw as object)) {
    const nested = (raw as { components?: ComponentSummary[] }).components;
    if (Array.isArray(nested)) components = nested;
  }

  if (components === null) {
    return (
      <main className="p-section flex items-center justify-center min-h-[60vh]">
        <div className="bg-surface-card rounded-card p-8 max-w-md text-center flex flex-col gap-3">
          <h1 className="text-2xl font-semibold text-text-primary">Components</h1>
          <p className="text-text-muted">
            No components yet. Expected: ~20 primitives, ~15 domain, ~8 layouts.
          </p>
          <p className="text-sm italic text-text-muted/60">
            Phase 1 creates the design system — run cc:scan after setup.
          </p>
        </div>
      </main>
    );
  }

  const sp = await searchParams;
  const params: PageParams = {
    view:  sp['view']  ?? DEFAULTS.view,
    sort:  sp['sort']  ?? DEFAULTS.sort,
    dir:   sp['dir']   ?? DEFAULTS.dir,
    layer: sp['layer'] ?? DEFAULTS.layer,
    story: sp['story'] ?? DEFAULTS.story,
    tests: sp['tests'] ?? DEFAULTS.tests,
  };

  const enriched: EnrichedComponent[] = components.map((comp) => ({
    ...comp,
    derivedLayer: deriveLayer(comp),
    hasStory:     deriveHasStory(comp),
    hasTests:     deriveHasTests(comp),
  }));

  // Apply filters
  let filtered = enriched;
  if (params.layer !== 'all') {
    filtered = filtered.filter((c) => c.derivedLayer === params.layer);
  }
  if (params.story === '1') {
    filtered = filtered.filter((c) => c.hasStory);
  }
  if (params.tests === '1') {
    filtered = filtered.filter((c) => c.hasTests);
  }

  // Sort for ListView
  const sorted = filtered.toSorted((a, b) => {
    let cmp = 0;
    switch (params.sort) {
      case 'name':   { cmp = a.name.localeCompare(b.name); break; }
      case 'layer':  { cmp = LAYER_ORDER[a.derivedLayer] - LAYER_ORDER[b.derivedLayer]; break; }
      case 'usedBy': { cmp = (b.dependencies?.length ?? 0) - (a.dependencies?.length ?? 0); break; }
      default: { break; }
    }
    return params.dir === 'desc' ? -cmp : cmp;
  });

  const activeView = ['grid', 'list', 'coverage'].includes(params.view) ? params.view : 'grid';

  return (
    <main className="p-section">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Components</h1>
        <p className="text-text-muted font-mono text-sm mt-1">{components.length} components</p>
      </div>
      <TabBar params={params} />
      <FilterBar params={params} />
      {activeView === 'grid'     && <GridView components={filtered} />}
      {activeView === 'list'     && <ListView components={sorted} params={params} />}
      {activeView === 'coverage' && <CoverageView components={filtered} />}
    </main>
  );
}
