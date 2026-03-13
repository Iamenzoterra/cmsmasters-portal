'use client';

import { type JSX } from 'react';
import { Select, type SelectOption } from '../ui/Select';
import { Input } from '../ui/Input';
import { cn } from '../theme/utils';
import type { TaskStatus, Owner, App } from '../lib/types';
import { X, Search } from 'lucide-react';

export interface TaskFilterState {
  phase: string;
  status: string;
  owner: string;
  app: string;
  search: string;
}

export interface TaskFiltersProps {
  filters: TaskFilterState;
  onChange: (f: TaskFilterState) => void;
  phaseOptions?: string[];
  appOptions?: App[];
}

const DEFAULT_PHASES = ['0', '1', '2', '3', '4', '5', '6'];

const ALL_APPS: App[] = [
  'portal',
  'dashboard',
  'support',
  'studio',
  'admin',
  'command-center',
  'ui',
  'infra',
  'content',
  'api',
];

const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review', 'done', 'blocked'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked',
};

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  ...TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

const OWNER_VALUES: Owner[] = ['orchestrator', 'claude-code', 'human', 'ai-content'];

const OWNER_LABELS: Record<Owner, string> = {
  orchestrator: 'Orchestrator',
  'claude-code': 'Claude Code',
  human: 'Human',
  'ai-content': 'AI Content',
};

const OWNER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Owners' },
  ...OWNER_VALUES.map((o) => ({ value: o, label: OWNER_LABELS[o] })),
];

function toTitleCase(str: string): string {
  return str
    .split('-')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

export function TaskFilters({
  filters,
  onChange,
  phaseOptions,
  appOptions,
}: TaskFiltersProps): JSX.Element {
  const phases = phaseOptions ?? DEFAULT_PHASES;
  const apps = appOptions ?? ALL_APPS;

  const phaseSelectOptions: SelectOption[] = [
    { value: 'all', label: 'All Phases' },
    ...phases.map((p) => ({ value: p, label: `Phase ${p}` })),
  ];

  const appSelectOptions: SelectOption[] = [
    { value: 'all', label: 'All Apps' },
    ...apps.map((a) => ({ value: a, label: toTitleCase(a) })),
  ];

  function update(key: keyof TaskFilterState, value: string): void {
    onChange({ ...filters, [key]: value });
  }

  const dropdownOptions: Record<Exclude<keyof TaskFilterState, 'search'>, SelectOption[]> = {
    phase: phaseSelectOptions,
    status: STATUS_OPTIONS,
    owner: OWNER_OPTIONS,
    app: appSelectOptions,
  };

  const activeChips: { key: keyof TaskFilterState; label: string }[] = [];

  for (const key of ['phase', 'status', 'owner', 'app'] as const) {
    if (filters[key] !== 'all') {
      const option = dropdownOptions[key].find((o) => o.value === filters[key]);
      activeChips.push({ key, label: option?.label ?? filters[key] });
    }
  }

  if (filters.search !== '') {
    activeChips.push({ key: 'search', label: `"${filters.search}"` });
  }

  return (
    <div>
      <div
        className={cn(
          'flex flex-wrap items-end gap-3 p-4',
          'bg-zinc-900/50 rounded-lg border border-zinc-800'
        )}
      >
        <div className="relative flex-1 min-w-[160px]">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none size-4 text-zinc-400"
          />
          <Input
            placeholder="Search tasks…"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          label="Phase"
          value={filters.phase}
          onChange={(e) => update('phase', e.target.value)}
          options={phaseSelectOptions}
        />

        <Select
          label="Status"
          value={filters.status}
          onChange={(e) => update('status', e.target.value)}
          options={STATUS_OPTIONS}
        />

        <Select
          label="Owner"
          value={filters.owner}
          onChange={(e) => update('owner', e.target.value)}
          options={OWNER_OPTIONS}
        />

        <Select
          label="App"
          value={filters.app}
          onChange={(e) => update('app', e.target.value)}
          options={appSelectOptions}
        />
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {activeChips.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => update(key, key === 'search' ? '' : 'all')}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                'text-xs bg-zinc-800 text-zinc-200 border border-zinc-700',
                'hover:bg-zinc-700 transition-colors duration-150'
              )}
            >
              {label}
              <X className="size-3" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
