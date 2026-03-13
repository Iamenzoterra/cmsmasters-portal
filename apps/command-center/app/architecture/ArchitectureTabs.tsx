'use client';

import { useState } from 'react';
import type React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/theme/utils';
import { ADRViewer } from '@/components/ADRViewer';
import type { ADRMetaWithBody } from '@/lib/types';

export interface TechStackItem {
  name: string;
  description: string;
}

export interface TechStackLayer {
  name: string;
  items: TechStackItem[];
}

interface ArchitectureTabsProps {
  adrs: ADRMetaWithBody[];
  workplanMarkdown: string | null;
  workplanPath: string;
  techStackLayers: TechStackLayer[];
}

type ActiveTab = 'adr' | 'workplan' | 'techstack';

export function ArchitectureTabs({
  adrs,
  workplanMarkdown,
  workplanPath,
  techStackLayers,
}: ArchitectureTabsProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<ActiveTab>('adr');

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'adr', label: 'ADR Bible' },
    { id: 'workplan', label: 'Grand Workplan' },
    { id: 'techstack', label: 'Tech Stack' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex shrink-0 items-end gap-1 border-b border-zinc-800 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-text-primary'
                : 'border-b-2 border-transparent text-text-muted hover:text-text-secondary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'adr' && <ADRViewer adrs={adrs} />}

        {activeTab === 'workplan' && (
          <div className="h-full overflow-y-auto">
            {workplanMarkdown === null ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-text-muted">File not found:</p>
                <span className="font-mono text-xs text-zinc-500">{workplanPath}</span>
              </div>
            ) : (
              <div className="max-w-4xl px-8 py-6">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="mb-4 mt-8 text-2xl font-bold text-text-primary first:mt-0">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="mb-3 mt-6 text-xl font-bold text-text-primary">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mb-2 mt-5 text-base font-bold text-text-primary">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="mb-2 mt-4 text-sm font-bold text-text-secondary">
                        {children}
                      </h4>
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
                  {workplanMarkdown}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {activeTab === 'techstack' && (
          <div className="h-full overflow-y-auto px-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              {techStackLayers.map((layer) => (
                <div
                  key={layer.name}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                >
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">
                    {layer.name}
                  </h3>
                  <ul className="space-y-2">
                    {layer.items.map((item) => (
                      <li key={item.name} className="text-sm">
                        <span className="font-medium text-text-primary">{item.name}</span>
                        {item.description && (
                          <span className="ml-1.5 text-text-muted">{item.description}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
