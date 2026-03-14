'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { cn } from '../theme/utils';

export interface SearchEntry {
  id: string;
  type: string;
  name: string;
  context: string;
  href: string;
  selectionKey: string;
}

interface GlobalSearchProps {
  searchIndex: SearchEntry[];
}

export function GlobalSearch({ searchIndex }: GlobalSearchProps): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = query.trim()
    ? searchIndex.filter((entry) =>
        entry.name.toLowerCase().includes(query.toLowerCase()) ||
        entry.context.toLowerCase().includes(query.toLowerCase()) ||
        entry.type.toLowerCase().includes(query.toLowerCase())
      )
    : searchIndex.slice(0, 8);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        break;
      }
      case 'Enter': {
        const entry = filtered[activeIdx];
        if (entry) {
          globalThis.location.assign(entry.href);
          setOpen(false);
        }
        break;
      }
      case 'Escape': {
        setOpen(false);
        break;
      }
      default: { break; }
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-surface-app/80"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg mx-4 bg-zinc-900 border border-zinc-700 rounded-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="size-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, phases, components, ADRs…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none text-sm"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close search"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {filtered.length > 0 ? (
          <ul className="py-2 max-h-80 overflow-y-auto">
            {filtered.map((entry, idx) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    idx === activeIdx
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-300 hover:bg-zinc-800/50'
                  )}
                  onClick={() => {
                    globalThis.location.assign(entry.href);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <span className="text-xs font-mono text-zinc-500 w-20 shrink-0 truncate">
                    {entry.type}
                  </span>
                  <span className="flex-1 text-sm truncate">{entry.name}</span>
                  {entry.context && (
                    <span className="text-xs text-zinc-500 truncate max-w-24">
                      {entry.context}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">No results</p>
        )}

        <div className="px-4 py-2 border-t border-zinc-800 flex gap-4 text-xs text-zinc-600">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
