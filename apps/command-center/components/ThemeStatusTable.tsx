'use client';

import { useState, useEffect } from 'react';
import { X, Search, ExternalLink, ImageOff, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/theme/utils';

export type ThemeEntryStatus = 'empty' | 'draft' | 'published';

export interface ThemeEntry {
  slug: string;
  name: string;
  status: ThemeEntryStatus;
  docsCount: number;
  hasHeroImage: boolean;
  pluginsCount: number;
  featuresCount: number;
  lastUpdated: string;
}

type DotColor = 'green' | 'yellow' | 'red';

function computeDotColor(theme: ThemeEntry): DotColor {
  if (theme.status === 'published' && theme.docsCount >= 5 && theme.hasHeroImage === true) {
    return 'green';
  }
  if (
    theme.status === 'draft' &&
    (theme.docsCount > 0 || theme.pluginsCount > 0 || theme.featuresCount > 0)
  ) {
    return 'yellow';
  }
  return 'red';
}

const DOT_CLASS: Record<DotColor, string> = {
  green: 'bg-status-success',
  yellow: 'bg-status-warning',
  red: 'bg-status-danger',
};

const STATUS_BADGE_CLASS: Record<DotColor, string> = {
  green: 'bg-green-900/40 text-green-400',
  yellow: 'bg-yellow-900/40 text-yellow-400',
  red: 'bg-red-900/40 text-red-400',
};

export function ThemeStatusTable({ themes }: { themes: ThemeEntry[] }): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DotColor>('all');
  const [selectedTheme, setSelectedTheme] = useState<ThemeEntry | null>(null);

  useEffect(() => {
    if (!selectedTheme) return;
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setSelectedTheme(null);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedTheme]);

  const filteredThemes = themes.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || computeDotColor(t) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isOpen = selectedTheme !== null;
  const dotColor = selectedTheme ? computeDotColor(selectedTheme) : 'red';

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search themes…"
            className="bg-surface-card border border-border-default rounded-card pl-8 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-text-muted transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | DotColor)}
          className="bg-surface-card border border-border-default rounded-card px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-text-muted transition-colors"
        >
          <option value="all">All statuses</option>
          <option value="green">Green</option>
          <option value="yellow">Yellow</option>
          <option value="red">Red</option>
        </select>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto rounded-card border border-border-default bg-surface-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default">
              {['Status', 'Name', 'Docs', 'Plugins', 'Features', 'Hero', 'Last Updated'].map(
                (col) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted whitespace-nowrap"
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filteredThemes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-text-muted">
                  No themes match the current filters
                </td>
              </tr>
            ) : (
              filteredThemes.map((theme) => {
                const dot = computeDotColor(theme);
                return (
                  <tr
                    key={theme.slug}
                    className="border-b border-border-default last:border-0 hover:bg-surface-hover cursor-pointer transition-colors"
                    onClick={() => setSelectedTheme(theme)}
                  >
                    <td className="px-3 py-2.5">
                      <span
                        className={cn('inline-block w-2 h-2 rounded-full', DOT_CLASS[dot])}
                        aria-label={dot}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-text-primary">{theme.name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-text-secondary">
                      {theme.docsCount}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-text-secondary">
                      {theme.pluginsCount}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-text-secondary">
                      {theme.featuresCount}
                    </td>
                    <td className="px-3 py-2.5">
                      {theme.hasHeroImage ? (
                        <ImageIcon className="w-3.5 h-3.5 text-status-success" />
                      ) : (
                        <ImageOff className="w-3.5 h-3.5 text-text-muted" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-text-muted">
                      {theme.lastUpdated}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSelectedTheme(null)}
        aria-hidden="true"
      />

      {/* Slide-out panel */}
      <div
        role="dialog"
        aria-modal={isOpen}
        aria-label={selectedTheme?.name ?? 'Theme detail'}
        className={cn(
          'fixed right-0 top-0 h-full w-[480px] z-50',
          'bg-surface-card border-l border-border-default',
          'flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Panel header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border-default sticky top-0 bg-surface-card z-10">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="text-sm font-semibold text-text-primary truncate leading-tight">
              {selectedTheme?.name ?? ''}
            </h2>
            <span className="font-mono text-xs text-text-muted">{selectedTheme?.slug ?? ''}</span>
          </div>
          <button
            onClick={() => setSelectedTheme(null)}
            className="shrink-0 text-text-muted hover:text-text-primary transition-colors p-1 -mr-1"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Panel body */}
        {selectedTheme && (
          <div className="overflow-y-auto flex-1 divide-y divide-border-default">
            {/* Status */}
            <section className="px-5 py-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Status
              </p>
              <span
                className={cn(
                  'inline-block px-2.5 py-0.5 rounded-badge text-xs font-semibold',
                  STATUS_BADGE_CLASS[dotColor]
                )}
              >
                {selectedTheme.status}
              </span>
            </section>

            {/* Content Counts */}
            <section className="px-5 py-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Content Counts
              </p>
              <div className="flex flex-col gap-2">
                {(
                  [
                    ['Docs', selectedTheme.docsCount],
                    ['Plugins', selectedTheme.pluginsCount],
                    ['Features', selectedTheme.featuresCount],
                  ] as [string, number][]
                ).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">{label}</span>
                    <span className="font-mono text-xs text-text-primary">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Hero Image */}
            <section className="px-5 py-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Hero Image
              </p>
              <div className="flex items-center gap-2">
                {selectedTheme.hasHeroImage ? (
                  <>
                    <ImageIcon className="w-4 h-4 text-status-success" />
                    <span className="text-xs text-status-success">Present</span>
                  </>
                ) : (
                  <>
                    <ImageOff className="w-4 h-4 text-text-muted" />
                    <span className="text-xs text-text-muted">Absent</span>
                  </>
                )}
              </div>
            </section>

            {/* Last Updated */}
            <section className="px-5 py-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Last Updated
              </p>
              <span className="font-mono text-xs text-text-secondary">{selectedTheme.lastUpdated}</span>
            </section>

            {/* Supabase link */}
            <section className="px-5 py-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Supabase
              </p>
              <a
                href="#"
                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Supabase
              </a>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
