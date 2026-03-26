import type React from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { getComponents } from '@/lib/data';
import type { ComponentSummary, LayerName } from '@/lib/types';
import { DonutChart } from '@/ui/DonutChart';
import { StatusDots } from '@/ui/StatusDots';
import { TokenCoveragePanel } from '@/ui/TokenCoveragePanel';
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
  source: string;
  status: string;
};

const DEFAULTS: PageParams = {
  view:   'grid',
  sort:   'name',
  dir:    'asc',
  layer:  'all',
  story:  '0',
  tests:  '0',
  source: 'all',
  status: 'all',
};

function buildHref(current: PageParams, overrides: Partial<PageParams>): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams({
    view:   merged.view,
    sort:   merged.sort,
    dir:    merged.dir,
    layer:  merged.layer,
    story:  merged.story,
    tests:  merged.tests,
    source: merged.source,
    status: merged.status,
  });
  return `/components?${params.toString()}`;
}

// ─── Layer derivation ────────────────────────────────────────────────────────

const LAYER_MAP: Record<string, LayerName> = {
  primitives: 'Primitives', domain: 'Domain',
  layouts: 'Layouts', infrastructure: 'Infrastructure',
};

function deriveLayer(comp: ComponentSummary): LayerName {
  // Filesystem entries: use real layer from scanner
  if (comp.source === 'filesystem' && comp.layer) return LAYER_MAP[comp.layer] ?? 'Layouts';
  // Legacy phases-json entries: keyword heuristic fallback
  if (INFRA_APPS.has(comp.app)) return 'Infrastructure';
  const lower = comp.name.toLowerCase();
  if (PRIMITIVE_KEYWORDS.some((kw) => lower.includes(kw))) return 'Primitives';
  if (DOMAIN_KEYWORDS.some((kw) => lower.includes(kw))) return 'Domain';
  return 'Layouts';
}

type EnrichedComponent = ComponentSummary & {
  derivedLayer: LayerName;
  hasStory: boolean;
  hasTests: boolean;
  hasCode: boolean;
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

  const sources: { label: string; value: string }[] = [
    { label: 'All Sources',    value: 'all'    },
    { label: 'UI Components',  value: 'ui'     },
    { label: 'Legacy Tasks',   value: 'legacy' },
  ];

  const statuses: { label: string; value: string }[] = [
    { label: 'All',         value: 'all'         },
    { label: 'Done',        value: 'done'        },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Planned',     value: 'planned'     },
  ];

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* Row 1: layers + story/tests */}
      <div className="flex flex-wrap gap-3 items-center">
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
      {/* Row 2: source + status */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {sources.map(({ label, value }) => (
            <Link
              key={`src-${value}`}
              href={buildHref(params, { source: value })}
              className={cn(
                'px-3 py-1 text-sm rounded-badge transition-colors',
                params.source === value
                  ? 'bg-surface-card border border-zinc-600 text-text-primary'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="flex gap-1">
          {statuses.map(({ label, value }) => (
            <Link
              key={`st-${value}`}
              href={buildHref(params, { status: value })}
              className={cn(
                'px-3 py-1 text-sm rounded-badge transition-colors',
                params.status === value
                  ? 'bg-surface-card border border-zinc-600 text-text-primary'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ComponentCard ────────────────────────────────────────────────────────────

function ComponentCard({ comp }: { comp: EnrichedComponent }): React.ReactElement {
  return (
    <Link href={`/components/${comp.id}`} className="bg-surface-card rounded-card p-4 flex flex-col gap-2 hover:bg-surface-hover transition-colors">
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
      <StatusDots hasCode={comp.hasCode} hasStory={comp.hasStory} hasTests={comp.hasTests} />
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className={cn('text-xs px-2 py-0.5 rounded-badge', LAYER_BADGE[comp.derivedLayer])}>
          {comp.derivedLayer}
        </span>
        <div className="flex items-center gap-2">
          {(comp.usedBy?.length ?? 0) > 0 && (
            <span className="font-mono text-xs text-text-muted" title={`Used by: ${comp.usedBy?.join(', ')}`}>
              {comp.usedBy?.length} app{(comp.usedBy?.length ?? 0) === 1 ? '' : 's'}
            </span>
          )}
          {comp.loc != null && (
            <span className="font-mono text-xs text-text-muted">{comp.loc} loc</span>
          )}
        </div>
      </div>
    </Link>
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
            <th className="pb-2 pr-4 font-medium">
              <SortHeader col="loc" label="LoC" params={params} />
            </th>
            <th className="pb-2 font-medium text-text-muted">Phase</th>
          </tr>
        </thead>
        <tbody>
          {components.map((comp) => (
            <tr
              key={comp.id}
              className="border-b border-border/50 hover:bg-surface-hover/30 transition-colors"
            >
              <td className="py-2 pr-4">
                <Link href={`/components/${comp.id}`} className="text-text-primary hover:text-blue-400 transition-colors">
                  {comp.name}
                </Link>
              </td>
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
                {comp.usedBy?.length ?? 0}
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-text-muted">
                {comp.loc ?? '—'}
              </td>
              <td className="py-2 font-mono text-xs text-text-muted">{comp.phase}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── LayerCoverageTable ───────────────────────────────────────────────────────

function LayerCoverageTable({ components }: { components: EnrichedComponent[] }): React.ReactElement {
  const layers: LayerName[] = ['Primitives', 'Domain', 'Layouts'];

  const rows = layers.map((layer) => {
    const comps = components.filter((c) => c.derivedLayer === layer);
    const total = comps.length;
    const stories = comps.filter((c) => c.hasStory).length;
    const tests = comps.filter((c) => c.hasTests).length;
    const avgLoc = total > 0 ? Math.round(comps.reduce((sum, c) => sum + (c.loc ?? 0), 0) / total) : 0;
    return { layer, total, stories, tests, avgLoc };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm max-w-xl mx-auto">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 pr-4 font-medium text-text-muted">Layer</th>
            <th className="pb-2 pr-4 font-medium text-text-muted text-right">Components</th>
            <th className="pb-2 pr-4 font-medium text-text-muted text-right">Stories</th>
            <th className="pb-2 pr-4 font-medium text-text-muted text-right">Tests</th>
            <th className="pb-2 font-medium text-text-muted text-right">Avg LoC</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ layer, total, stories, tests, avgLoc }) => (
            <tr key={layer} className="border-b border-border/50">
              <td className="py-2 pr-4">
                <span className={cn('text-xs px-2 py-0.5 rounded-badge', LAYER_BADGE[layer])}>
                  {layer}
                </span>
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-text-primary text-right">{total}</td>
              <td className="py-2 pr-4 font-mono text-xs text-right">
                {total > 0 ? (
                  <span className={stories === total ? 'text-status-success' : 'text-text-muted'}>
                    {stories}/{total}
                  </span>
                ) : (
                  <span className="text-zinc-600">&mdash;</span>
                )}
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-right">
                {total > 0 ? (
                  <span className={tests === total ? 'text-status-success' : 'text-text-muted'}>
                    {tests}/{total}
                  </span>
                ) : (
                  <span className="text-zinc-600">&mdash;</span>
                )}
              </td>
              <td className="py-2 font-mono text-xs text-text-muted text-right">{avgLoc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── CoverageView ─────────────────────────────────────────────────────────────

function CoverageView({ components }: { components: EnrichedComponent[] }): React.ReactElement {
  const uiComponents = components.filter((c) => c.source === 'filesystem');
  const legacyTasks  = components.filter((c) => c.source === 'phases-json');

  // UI metrics (only real components)
  const uiTotal    = uiComponents.length;
  const storyCount = uiComponents.filter((c) => c.hasStory).length;
  const testCount  = uiComponents.filter((c) => c.hasTests).length;
  const appCount   = uiComponents.filter((c) => (c.usedBy?.length ?? 0) > 0).length;

  const storyCoverage = uiTotal > 0 ? Math.round((storyCount / uiTotal) * 100) : 0;
  const testCoverage  = uiTotal > 0 ? Math.round((testCount  / uiTotal) * 100) : 0;
  const appUsage      = uiTotal > 0 ? Math.round((appCount   / uiTotal) * 100) : 0;

  // Legacy progress
  const legacyTotal = legacyTasks.length;
  const legacyDone  = legacyTasks.filter((c) => c.status === 'done').length;
  const legacyPct   = legacyTotal > 0 ? Math.round((legacyDone / legacyTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-8 py-8">
      {/* UI Component Coverage */}
      <div>
        <h3 className="text-text-primary font-semibold text-sm mb-4">
          UI Component Coverage
          <span className="text-text-muted font-normal ml-2">({uiTotal} components)</span>
        </h3>
        {uiTotal === 0 ? (
          <p className="text-text-muted text-sm italic">
            No UI components yet — Phase C will deliver primitives to packages/ui/src/
          </p>
        ) : (
          <div className="flex flex-wrap gap-8 justify-center">
            <div className="flex flex-col items-center gap-2">
              <DonutChart value={storyCoverage} label="Stories" color="#3b82f6" />
              <p className="font-mono text-xs text-text-muted">{storyCount} / {uiTotal}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DonutChart value={testCoverage} label="Tests" color="#22c55e" />
              <p className="font-mono text-xs text-text-muted">{testCount} / {uiTotal}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DonutChart value={appUsage} label="App Usage" color="#f59e0b" />
              <p className="font-mono text-xs text-text-muted">{appCount} / {uiTotal}</p>
            </div>
          </div>
        )}
      </div>

      {/* Per-Layer Breakdown */}
      {uiTotal > 0 && <LayerCoverageTable components={uiComponents} />}

      {/* Legacy Task Progress */}
      <div>
        <h3 className="text-text-primary font-semibold text-sm mb-4">
          Project Task Progress
          <span className="text-text-muted font-normal ml-2">({legacyTotal} tasks)</span>
        </h3>
        <div className="flex flex-wrap gap-8 justify-center">
          <div className="flex flex-col items-center gap-2">
            <DonutChart value={legacyPct} label="Done" color="#a78bfa" />
            <p className="font-mono text-xs text-text-muted">{legacyDone} / {legacyTotal}</p>
          </div>
        </div>
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
  const components = await getComponents();

  if (!components || components.length === 0) {
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
    view:   sp['view']   ?? DEFAULTS.view,
    sort:   sp['sort']   ?? DEFAULTS.sort,
    dir:    sp['dir']    ?? DEFAULTS.dir,
    layer:  sp['layer']  ?? DEFAULTS.layer,
    story:  sp['story']  ?? DEFAULTS.story,
    tests:  sp['tests']  ?? DEFAULTS.tests,
    source: sp['source'] ?? DEFAULTS.source,
    status: sp['status'] ?? DEFAULTS.status,
  };

  const enriched: EnrichedComponent[] = components.map((comp) => ({
    ...comp,
    derivedLayer: deriveLayer(comp),
    hasStory:     comp.hasStory ?? false,
    hasTests:     comp.hasTests ?? false,
    hasCode:      comp.source === 'filesystem',
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
  if (params.source === 'ui') {
    filtered = filtered.filter((c) => c.source === 'filesystem');
  } else if (params.source === 'legacy') {
    filtered = filtered.filter((c) => c.source === 'phases-json');
  }
  if (params.status !== 'all') {
    filtered = filtered.filter((c) => c.status === params.status);
  }

  // Sort for ListView
  const sorted = filtered.toSorted((a, b) => {
    let cmp = 0;
    switch (params.sort) {
      case 'name':   { cmp = a.name.localeCompare(b.name); break; }
      case 'layer':  { cmp = LAYER_ORDER[a.derivedLayer] - LAYER_ORDER[b.derivedLayer]; break; }
      case 'usedBy': { cmp = (b.usedBy?.length ?? 0) - (a.usedBy?.length ?? 0); break; }
      case 'loc':    { cmp = (a.loc ?? 0) - (b.loc ?? 0); break; }
      default: { break; }
    }
    return params.dir === 'desc' ? -cmp : cmp;
  });

  const activeView = ['grid', 'list', 'coverage'].includes(params.view) ? params.view : 'grid';
  const uiCount = enriched.filter((c) => c.source === 'filesystem').length;

  return (
    <main className="p-section">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Components</h1>
        <p className="text-text-muted font-mono text-sm mt-1">
          {filtered.length === enriched.length
            ? `${enriched.length} items`
            : `${filtered.length} / ${enriched.length} items`}
          {uiCount > 0 && (
            <span className="ml-2 text-blue-400">
              ({uiCount} UI component{uiCount === 1 ? '' : 's'})
            </span>
          )}
        </p>
      </div>
      <TokenCoveragePanel />
      <TabBar params={params} />
      <FilterBar params={params} />
      {activeView === 'grid'     && <GridView components={filtered} />}
      {activeView === 'list'     && <ListView components={sorted} params={params} />}
      {activeView === 'coverage' && <CoverageView components={filtered} />}
    </main>
  );
}
