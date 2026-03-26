import type React from 'react';
import Link from 'next/link';
import { getComponents } from '@/lib/data';
import type { ComponentSummary, LayerName } from '@/lib/types';
import { StatusDots } from '@/ui/StatusDots';
import { cn } from '@/theme/utils';
import { ComponentPreview } from './component-preview';

// ─── Layer derivation (shared with page.tsx — extract in Phase 5) ────────────

const INFRA_APPS = new Set(['infra', 'command-center', 'db', 'auth', 'email', 'validators', 'api-client']);
const PRIMITIVE_KEYWORDS = ['primitive', 'token', 'atom', 'color', 'font', 'spacing', 'icon'];
const DOMAIN_KEYWORDS = ['domain', 'button', 'badge', 'input', 'card', 'modal', 'select', 'checkbox', 'progress'];
const LAYER_MAP: Record<string, LayerName> = {
  primitives: 'Primitives', domain: 'Domain', layouts: 'Layouts', infrastructure: 'Infrastructure',
};

function deriveLayer(comp: ComponentSummary): LayerName {
  if (comp.source === 'filesystem' && comp.layer) return LAYER_MAP[comp.layer] ?? 'Layouts';
  if (INFRA_APPS.has(comp.app)) return 'Infrastructure';
  const lower = comp.name.toLowerCase();
  if (PRIMITIVE_KEYWORDS.some((kw) => lower.includes(kw))) return 'Primitives';
  if (DOMAIN_KEYWORDS.some((kw) => lower.includes(kw))) return 'Domain';
  return 'Layouts';
}

const LAYER_BADGE: Record<LayerName, string> = {
  Primitives:     'bg-blue-500/20 text-blue-400',
  Domain:         'bg-purple-500/20 text-purple-400',
  Layouts:        'bg-amber-500/20 text-amber-400',
  Infrastructure: 'bg-zinc-500/20 text-zinc-400',
};

const STATUS_BADGE: Record<string, string> = {
  done:          'bg-status-success/20 text-status-success',
  'in-progress': 'bg-status-active/20 text-status-active',
  planned:       'bg-zinc-700/40 text-text-muted',
  blocked:       'bg-status-danger/20 text-status-danger',
};

// ─── Props parser ────────────────────────────────────────────────────────────

interface PropRow {
  name: string;
  type: string;
  required: boolean;
}

function parsePropsInterface(raw: string | null | undefined): PropRow[] {
  if (!raw) return [];
  const rows: PropRow[] = [];
  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Match: propName?: Type; or propName: Type;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx < 1) continue;
    const semiIdx = trimmed.lastIndexOf(';');
    if (semiIdx < colonIdx) continue;

    let name = trimmed.slice(0, colonIdx).trim();
    const optional = name.endsWith('?');
    if (optional) name = name.slice(0, -1);
    const type = trimmed.slice(colonIdx + 1, semiIdx).trim();
    if (name.length > 0 && type.length > 0 && !name.includes(' ')) {
      rows.push({ name, type, required: !optional });
    }
  }

  return rows;
}

// ─── MetadataStrip ───────────────────────────────────────────────────────────

function MetadataStrip({ comp, isUiComponent }: { comp: ComponentSummary; isUiComponent: boolean }): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-4 mt-4 py-3 border-y border-border text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">Source:</span>
        <span className={cn('font-mono text-xs px-2 py-0.5 rounded-badge', isUiComponent ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700/40 text-text-muted')}>
          {isUiComponent ? 'UI Component' : 'Legacy Task'}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">Phase:</span>
        <span className="font-mono text-xs text-text-primary">{comp.phase}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">App:</span>
        <span className="font-mono text-xs text-text-primary">{comp.app}</span>
      </div>

      {(comp.usedBy?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">Used by:</span>
          <div className="flex gap-1">
            {comp.usedBy?.map((app) => (
              <span key={app} className="font-mono text-xs px-2 py-0.5 rounded-badge bg-surface-hover text-text-secondary">{app}</span>
            ))}
          </div>
        </div>
      )}

      {comp.loc != null && (
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">Lines:</span>
          <span className="font-mono text-xs text-text-primary">{comp.loc}</span>
        </div>
      )}

      {comp.hasStory && (
        <a
          href={`http://localhost:6006/?path=/story/${comp.layer ?? 'primitives'}-${comp.name.toLowerCase().replaceAll(' ', '-')}--default`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline text-xs ml-auto"
        >
          Open in Storybook &rarr;
        </a>
      )}
    </div>
  );
}

// ─── PreviewPanel ────────────────────────────────────────────────────────────

function PreviewPanel({ comp, isUiComponent }: { comp: ComponentSummary; isUiComponent: boolean }): React.ReactElement {
  if (!isUiComponent) {
    return (
      <div className="bg-surface-card rounded-card p-6">
        <h2 className="text-text-primary font-semibold text-sm mb-3">Preview</h2>
        <div className="flex items-center justify-center h-40 rounded-lg border border-dashed border-border">
          <p className="text-text-muted text-sm italic">Legacy task — no component to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-card p-6">
      <h2 className="text-text-primary font-semibold text-sm mb-3">Preview</h2>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-white p-8 min-h-[200px]">
          <ComponentPreview componentId={comp.id} />
        </div>
      </div>
      {comp.filePath && (
        <p className="font-mono text-xs text-text-muted mt-2">{comp.filePath}</p>
      )}
    </div>
  );
}

// ─── PropsTable ──────────────────────────────────────────────────────────────

function PropsTable({ comp, isUiComponent }: { comp: ComponentSummary; isUiComponent: boolean }): React.ReactElement {
  if (!isUiComponent) {
    return (
      <div className="bg-surface-card rounded-card p-6">
        <h2 className="text-text-primary font-semibold text-sm mb-3">Props</h2>
        <p className="text-text-muted text-sm italic">Legacy task — no props interface</p>
      </div>
    );
  }

  const props = parsePropsInterface(comp.propsInterface);

  if (props.length === 0) {
    return (
      <div className="bg-surface-card rounded-card p-6">
        <h2 className="text-text-primary font-semibold text-sm mb-3">Props</h2>
        <p className="text-text-muted text-sm italic">
          Props not yet documented — will be extracted when component file exists
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-card p-6">
      <h2 className="text-text-primary font-semibold text-sm mb-3">Props</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-4 font-medium text-text-muted">Name</th>
              <th className="pb-2 pr-4 font-medium text-text-muted">Type</th>
              <th className="pb-2 font-medium text-text-muted">Required</th>
            </tr>
          </thead>
          <tbody>
            {props.map((prop) => (
              <tr key={prop.name} className="border-b border-border/50">
                <td className="py-2 pr-4 font-mono text-xs text-text-primary">{prop.name}</td>
                <td className="py-2 pr-4 font-mono text-xs text-blue-400">{prop.type}</td>
                <td className="py-2 text-xs">
                  {prop.required
                    ? <span className="text-status-warning">required</span>
                    : <span className="text-text-muted">optional</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {comp.propsInterface && (
        <details className="mt-3">
          <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">
            Raw interface
          </summary>
          <pre className="mt-2 p-3 bg-zinc-900 rounded-lg text-xs text-text-secondary overflow-x-auto font-mono">
            {comp.propsInterface}
          </pre>
        </details>
      )}
    </div>
  );
}

// ─── CodeExample ─────────────────────────────────────────────────────────────

function CodeExample({ comp, isUiComponent }: { comp: ComponentSummary; isUiComponent: boolean }): React.ReactElement {
  if (!isUiComponent) {
    return (
      <div className="bg-surface-card rounded-card p-6">
        <h2 className="text-text-primary font-semibold text-sm mb-3">Usage</h2>
        <p className="text-text-muted text-sm italic">Legacy task — no code example</p>
      </div>
    );
  }

  const pascalName = comp.name
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');

  const example = [
    `import { ${pascalName} } from '@cmsmasters/ui';`,
    '',
    'export default function Example() {',
    `  return <${pascalName} />;`,
    '}',
  ].join('\n');

  return (
    <div className="bg-surface-card rounded-card p-6">
      <h2 className="text-text-primary font-semibold text-sm mb-3">Usage</h2>
      <pre className="p-4 bg-zinc-900 rounded-lg text-xs text-text-secondary overflow-x-auto font-mono leading-relaxed">
        {example}
      </pre>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ComponentDetailPage({ params }: Props): Promise<React.ReactElement> {
  const { id } = await params;
  const components = await getComponents();
  const comp = components?.find((c) => c.id === id);

  if (!comp) {
    return (
      <main className="p-section">
        <Link href="/components" className="text-sm text-blue-400 hover:underline">&larr; Back to components</Link>
        <div className="bg-surface-card rounded-card p-8 mt-4 text-center">
          <h1 className="text-xl font-semibold text-text-primary">Component not found</h1>
          <p className="text-text-muted mt-2 font-mono text-sm">{id}</p>
        </div>
      </main>
    );
  }

  const layer = deriveLayer(comp);
  const isUiComponent = comp.source === 'filesystem';

  return (
    <main className="p-section">
      <Link href="/components" className="text-sm text-blue-400 hover:underline">&larr; Back to components</Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary">{comp.name}</h1>
            <span className={cn('text-xs px-2 py-0.5 rounded-badge', LAYER_BADGE[layer])}>{layer}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-badge font-mono', STATUS_BADGE[comp.status] ?? 'bg-zinc-700/40 text-text-muted')}>{comp.status}</span>
          </div>
          <p className="text-sm text-text-secondary">{comp.description}</p>
          {comp.filePath && (
            <p className="font-mono text-xs text-text-muted mt-1">{comp.filePath}</p>
          )}
        </div>
        <StatusDots hasCode={isUiComponent} hasStory={comp.hasStory ?? false} hasTests={comp.hasTests ?? false} />
      </div>

      <MetadataStrip comp={comp} isUiComponent={isUiComponent} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <PreviewPanel comp={comp} isUiComponent={isUiComponent} />
        <div className="flex flex-col gap-6">
          <PropsTable comp={comp} isUiComponent={isUiComponent} />
          <CodeExample comp={comp} isUiComponent={isUiComponent} />
        </div>
      </div>
    </main>
  );
}
