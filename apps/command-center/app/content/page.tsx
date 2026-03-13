import type React from 'react';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card } from '@/ui/Card';
import { ProgressBar } from '@/ui/ProgressBar';
import type { ContentStatus } from '@/lib/types';
import { ThemeStatusTable } from '@/components/ThemeStatusTable';
import type { ThemeEntry } from '@/components/ThemeStatusTable';

type ContentFileShape = {
  entries: ContentStatus[];
  source?: string;
  lastScanned?: string;
};

const MONOREPO_ROOT = path.resolve(process.cwd(), '..', '..');
const VALIDATORS_SRC = path.join(MONOREPO_ROOT, 'packages', 'validators', 'src');
const SCHEMA_FILES = ['theme.ts', 'doc.ts', 'blog-post.ts', 'plugin.ts', 'collection.ts'];

function mapStatus(status: string): 'empty' | 'draft' | 'published' {
  if (status === 'published' || status === 'approved') return 'published';
  if (status === 'empty') return 'empty';
  return 'draft';
}

function buildThemeEntries(entries: ContentStatus[]): ThemeEntry[] {
  const themeMap = new Map<string, ThemeEntry>();
  for (const entry of entries) {
    const existing = themeMap.get(entry.themeId);
    if (existing) {
      if (entry.type === 'doc') existing.docsCount += 1;
      if (new Date(entry.updatedAt) > new Date(existing.lastUpdated)) {
        existing.lastUpdated = entry.updatedAt;
        existing.status = mapStatus(entry.status);
      }
    } else {
      themeMap.set(entry.themeId, {
        slug: entry.themeId,
        name: entry.themeId,
        status: mapStatus(entry.status),
        docsCount: entry.type === 'doc' ? 1 : 0,
        pluginsCount: 0,
        featuresCount: 0,
        hasHeroImage: false,
        lastUpdated: entry.updatedAt,
      });
    }
  }
  return [...themeMap.values()].toSorted((a, b) => a.slug.localeCompare(b.slug));
}

function pct(published: number, total: number): number {
  return total > 0 ? Math.round((published / total) * 100) : 0;
}

export default async function Content(): Promise<React.ReactElement> {
  const rawFile: ContentFileShape | null = await fs
    .readFile(path.join(MONOREPO_ROOT, 'workplan', 'content-status.json'), 'utf8')
    .then((t) => JSON.parse(t) as ContentFileShape)
    .catch(() => null);

  if (rawFile === null || rawFile.source === 'placeholder') {
    return (
      <main className="p-6">
        <Card>
          <p className="text-text-muted text-sm">
            Content lives in Supabase. Run{' '}
            <code className="font-mono bg-surface-hover px-1 py-0.5 rounded text-text-primary">
              cc:scan --content
            </code>{' '}
            after Supabase is configured.
          </p>
        </Card>
      </main>
    );
  }

  const entries = rawFile.entries;
  const docs = entries.filter((e) => e.type === 'doc');
  const blogs = entries.filter((e) => e.type === 'blog');
  const themeIds = new Set(entries.map((e) => e.themeId));

  const metrics = {
    themesPublished: entries.filter((e) => e.status === 'published').length,
    themesTotal: themeIds.size,
    docsPublished: docs.filter((e) => e.status === 'published').length,
    docsTarget: docs.length,
    blogPosts: blogs.filter((e) => e.status === 'published').length,
    blogTarget: blogs.length,
  };

  const schemas = await Promise.all(
    SCHEMA_FILES.map((name) =>
      fs
        .access(path.join(VALIDATORS_SRC, name))
        .then(() => ({ name, exists: true }))
        .catch(() => ({ name, exists: false }))
    )
  );

  const themes = buildThemeEntries(entries);

  const kpis = [
    {
      href: '#themes-table',
      fraction: `${metrics.themesPublished}/${metrics.themesTotal}`,
      label: 'Themes',
      value: pct(metrics.themesPublished, metrics.themesTotal),
    },
    {
      href: '#docs-section',
      fraction: `${metrics.docsPublished}/${metrics.docsTarget}`,
      label: 'Docs',
      value: pct(metrics.docsPublished, metrics.docsTarget),
    },
    {
      href: '#blog-section',
      fraction: `${metrics.blogPosts}/${metrics.blogTarget}`,
      label: 'Blog Posts',
      value: pct(metrics.blogPosts, metrics.blogTarget),
    },
  ];

  return (
    <main className="scroll-smooth flex flex-col gap-8 p-6">
      <h1 className="text-text-primary text-2xl font-semibold">Content</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map(({ href, fraction, label, value }) => (
          <a key={href} href={href} className="no-underline">
            <Card className="flex flex-col gap-2">
              <span className="font-mono font-bold text-4xl text-text-primary">{fraction}</span>
              <span className="text-xs text-text-muted mt-1">{label}</span>
              <ProgressBar value={value} showLabel={false} />
            </Card>
          </a>
        ))}
      </div>

      {/* Themes section */}
      <section id="themes-table" className="flex flex-col gap-4">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Theme Status
        </span>
        <ThemeStatusTable themes={themes} />
      </section>

      {/* Docs anchor */}
      <span id="docs-section" />

      {/* Schema checklist */}
      <section id="schema-checklist" className="flex flex-col gap-4">
        <Card>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Zod Schemas (packages/validators)
          </span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
            {schemas.map(({ name, exists }) => (
              <div key={name} className="flex items-center gap-2">
                {exists ? (
                  <CheckCircle2 size={16} className="text-status-success" />
                ) : (
                  <Circle size={16} className="text-text-muted" />
                )}
                <span className="text-sm text-text-primary">{name}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Blog anchor */}
      <span id="blog-section" />
    </main>
  );
}
