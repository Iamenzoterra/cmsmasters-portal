'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { JSX } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ListChecks, Blocks, Palette, FileText } from 'lucide-react';
import { cn } from '../theme/utils';

export type SearchItemType = 'task' | 'component' | 'theme' | 'adr';

export interface SearchItem {
  id: string;
  type: SearchItemType;
  name: string;
  context: string;
  href: string;
}

interface GlobalSearchProps {
  searchIndex: SearchItem[];
}

const TYPE_ORDER: SearchItemType[] = ['task', 'component', 'theme', 'adr'];

const TYPE_LABELS: Record<SearchItemType, string> = {
  task: 'Tasks',
  component: 'Components',
  theme: 'Themes',
  adr: 'ADRs',
};

const TYPE_ICONS: Record<SearchItemType, React.ComponentType<{ size?: number; className?: string }>> = {
  task: ListChecks,
  component: Blocks,
  theme: Palette,
  adr: FileText,
};

export function GlobalSearch({ searchIndex }: GlobalSearchProps): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (e.key === '/') {
        const target = e.target as HTMLElement;
        const tag = target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || target.isContentEditable) return;
        e.preventDefault();
        open();
        return;
      }

      if (e.key === 'Escape' && isOpen) {
        close();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, open, close]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const filteredGroups = useMemo((): Map<SearchItemType, SearchItem[]> => {
    const q = query.toLowerCase().trim();
    const groups = new Map<SearchItemType, SearchItem[]>();

    for (const type of TYPE_ORDER) {
      groups.set(type, []);
    }

    if (!q) return groups;

    for (const item of searchIndex) {
      const matches =
        item.name.toLowerCase().includes(q) || item.context.toLowerCase().includes(q);
      if (!matches) continue;

      const group = groups.get(item.type);
      if (group && group.length < 5) {
        group.push(item);
      }
    }

    return groups;
  }, [query, searchIndex]);

  const hasResults = useMemo(
    () => TYPE_ORDER.some((t) => (filteredGroups.get(t)?.length ?? 0) > 0),
    [filteredGroups],
  );

  function handleItemClick(item: SearchItem): void {
    router.push(item.href);
    close();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]"
      onClick={close}
    >
      <div
        className={cn(
          'w-full max-w-xl overflow-hidden rounded-card border border-border-default bg-surface-card shadow-2xl',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Input row */}
        <div className="flex items-center gap-3 border-b border-border-default px-4 py-3">
          <Search size={16} className="shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, components, themes, ADRs…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <button
            onClick={close}
            className="shrink-0 rounded-badge p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label="Close search"
          >
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        {query.trim() !== '' && (
          <div className="max-h-96 overflow-y-auto">
            {hasResults ? (
              TYPE_ORDER.map((type) => {
                const items = filteredGroups.get(type) ?? [];
                if (items.length === 0) return null;
                const Icon = TYPE_ICONS[type];
                return (
                  <div key={type}>
                    <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      {TYPE_LABELS[type]}
                    </p>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover"
                      >
                        <Icon size={16} className="shrink-0 text-text-muted" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-text-primary">
                            {item.name}
                          </span>
                          {item.context && (
                            <span className="block truncate text-xs text-text-muted">
                              {item.context}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 rounded-badge bg-surface-hover px-2 py-0.5 text-xs text-text-secondary">
                          {TYPE_LABELS[item.type]}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })
            ) : (
              <p className="px-4 py-6 text-center text-sm text-text-muted">
                No results for &ldquo;{query}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
