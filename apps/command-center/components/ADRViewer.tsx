'use client';

import { useState, useMemo } from 'react';
import type React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search } from 'lucide-react';
import { cn } from '@/theme/utils';
import type { ADRMetaWithBody } from '@/lib/types';
import { Input } from '@/ui/Input';

const CATEGORY_ORDER = [
  'core',
  'access',
  'tech-stack',
  'product',
  'roles-security',
  'tooling',
  'data-future',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  access: 'Access',
  'tech-stack': 'Tech Stack',
  product: 'Product',
  'roles-security': 'Roles & Security',
  tooling: 'Tooling',
  'data-future': 'Data & Future',
};

function adrStatusBadge(status: string): string {
  if (status === 'active' || status === 'accepted') return 'bg-green-900 text-green-400';
  if (status === 'proposed' || status === 'deprecated') return 'bg-yellow-900 text-yellow-400';
  if (status === 'superseded') return 'bg-red-900 text-red-400';
  return 'bg-zinc-700 text-zinc-400';
}

interface ADRViewerProps {
  adrs: ADRMetaWithBody[];
}

export function ADRViewer({ adrs }: ADRViewerProps): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(adrs[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAdrs = useMemo(() => {
    if (!searchQuery) return adrs;
    const q = searchQuery.toLowerCase();
    return adrs.filter(
      (adr) => adr.title.toLowerCase().includes(q) || adr.body.toLowerCase().includes(q),
    );
  }, [adrs, searchQuery]);

  const groupedAdrs = useMemo(() => {
    const map: Record<string, ADRMetaWithBody[]> = {};
    for (const adr of filteredAdrs) {
      const cat = adr.category ?? 'uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(adr);
    }
    return map;
  }, [filteredAdrs]);

  const selectedAdr = adrs.find((a) => a.id === selectedId);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar */}
      <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-zinc-800">
        <div className="border-b border-zinc-800 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search ADRs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredAdrs.length === 0 ? (
            <div className="flex items-center justify-center p-6 text-sm text-text-muted">
              No ADRs match your search
            </div>
          ) : (
            CATEGORY_ORDER.map((cat) => {
              const catAdrs = groupedAdrs[cat];
              if (!catAdrs || catAdrs.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-surface-card px-3 py-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                    <span className="font-mono text-xs text-text-muted">{catAdrs.length}</span>
                  </div>
                  {[...catAdrs]
                    .toSorted((a, b) => Number(a.id) - Number(b.id))
                    .map((adr) => (
                      <div
                        key={adr.id}
                        onClick={() => setSelectedId(adr.id)}
                        className={cn(
                          'cursor-pointer border-b border-zinc-800/50 px-3 py-2',
                          selectedId === adr.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50',
                        )}
                      >
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <span className="shrink-0 font-mono text-[10px] text-text-muted">
                            ADR-{String(adr.id).padStart(3, '0')}
                          </span>
                          <span
                            className={cn(
                              'rounded px-1 py-0.5 text-[9px] font-bold uppercase',
                              adrStatusBadge(adr.status),
                            )}
                          >
                            {adr.status}
                          </span>
                        </div>
                        <p className="text-sm leading-snug text-text-primary">{adr.title}</p>
                      </div>
                    ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto">
        {selectedAdr ? (
          <div className="max-w-3xl p-6">
            {/* Header */}
            <div className="mb-6">
              <span className="font-mono text-xs text-text-muted">
                ADR-{String(selectedAdr.id).padStart(3, '0')}
              </span>
              <h1 className="mt-1 text-xl font-bold text-text-primary">{selectedAdr.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-text-muted">{selectedAdr.date}</span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                    adrStatusBadge(selectedAdr.status),
                  )}
                >
                  {selectedAdr.status}
                </span>
                {selectedAdr.category && (
                  <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-bold uppercase text-zinc-400">
                    {CATEGORY_LABELS[selectedAdr.category] ?? selectedAdr.category}
                  </span>
                )}
              </div>
            </div>

            {/* Markdown body */}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="mb-3 mt-6 text-lg font-bold text-text-primary">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-2 mt-5 text-base font-bold text-text-primary">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-4 text-sm font-bold text-text-primary">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="mb-3 text-sm leading-relaxed text-text-secondary">{children}</p>
                ),
                code: ({ className, children }) => {
                  const isBlock = className?.startsWith('language-') === true;
                  return isBlock ? (
                    <code className="font-mono text-sm text-zinc-300">{children}</code>
                  ) : (
                    <code className="rounded bg-zinc-800 px-1 font-mono text-sm text-zinc-300">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="mb-4 overflow-x-auto rounded border border-zinc-800 bg-zinc-900 p-4">
                    {children}
                  </pre>
                ),
                a: ({ href, children }) => (
                  <a href={href} className="text-blue-400 hover:underline">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="mb-4 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="border-b border-zinc-700">{children}</thead>
                ),
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr className="border-b border-zinc-800">{children}</tr>,
                th: ({ children }) => (
                  <th className="px-3 py-2 text-left text-xs font-bold text-text-muted">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 text-sm text-text-secondary">{children}</td>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-text-secondary">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="mb-3 border-l-2 border-zinc-600 pl-4 italic text-text-muted">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-4 border-zinc-700" />,
                strong: ({ children }) => (
                  <strong className="font-bold text-text-primary">{children}</strong>
                ),
              }}
            >
              {selectedAdr.body}
            </ReactMarkdown>

            {/* Related ADRs */}
            {selectedAdr.relatedADRs && selectedAdr.relatedADRs.length > 0 && (
              <div className="mt-6 border-t border-zinc-800 pt-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">
                  Related ADRs
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAdr.relatedADRs.map((relatedId) => {
                    const refAdr = adrs.find((a) => String(a.id) === String(relatedId));
                    return (
                      <button
                        key={relatedId}
                        type="button"
                        onClick={() => setSelectedId(relatedId)}
                        className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-zinc-800"
                      >
                        <span className="font-mono text-xs text-text-muted">
                          ADR-{String(relatedId).padStart(3, '0')}
                        </span>
                        {refAdr && (
                          <span className="text-text-secondary">{refAdr.title}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-text-muted">
            Select an ADR from the sidebar
          </div>
        )}
      </div>
    </div>
  );
}
