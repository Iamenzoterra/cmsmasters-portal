'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../theme/utils';

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';

export interface Task {
  id: string;
  title: string;
  owner: string;
  app: string;
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  estimatedHours: number;
  actualHours: number;
  status: TaskStatus;
}

type SortColumn = 'id' | 'title' | 'owner' | 'app' | 'priority' | 'estimatedHours' | 'actualHours' | 'status';

interface TaskTableProps {
  tasks: Task[];
  onSelect: (id: string) => void;
  initialSortColumn?: SortColumn;
  initialSortDirection?: 'asc' | 'desc';
}

const STATUS_DOT_CONFIG: Record<TaskStatus, string> = {
  todo: 'bg-zinc-500',
  'in-progress': 'bg-status-active',
  review: 'bg-status-warning',
  done: 'bg-status-success',
  blocked: 'bg-status-danger',
};

const PRIORITY_COLOR: Record<'high' | 'medium' | 'low', string> = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-zinc-400',
};

interface ColumnDef {
  label: string;
  key: SortColumn | 'dependencies';
  sortable: boolean;
}

const COLUMN_DEFS: ColumnDef[] = [
  { label: 'Status', key: 'status', sortable: true },
  { label: 'ID', key: 'id', sortable: true },
  { label: 'Title', key: 'title', sortable: true },
  { label: 'Owner', key: 'owner', sortable: true },
  { label: 'App', key: 'app', sortable: true },
  { label: 'Priority', key: 'priority', sortable: true },
  { label: 'Dependencies', key: 'dependencies', sortable: false },
  { label: 'Est. Hours', key: 'estimatedHours', sortable: true },
  { label: 'Act. Hours', key: 'actualHours', sortable: true },
];

function getSortIcon(
  col: ColumnDef,
  sort: { column: SortColumn; direction: 'asc' | 'desc' }
): React.ReactNode {
  if (sort.column !== col.key) return <ChevronsUpDown className="w-3 h-3 opacity-50" />;
  return sort.direction === 'asc' ? (
    <ChevronUp className="w-3 h-3" />
  ) : (
    <ChevronDown className="w-3 h-3" />
  );
}

export function TaskTable({
  tasks,
  onSelect,
  initialSortColumn,
  initialSortDirection,
}: TaskTableProps): React.JSX.Element {
  const [sort, setSort] = useState<{ column: SortColumn; direction: 'asc' | 'desc' }>({
    column: initialSortColumn ?? 'id',
    direction: initialSortDirection ?? 'asc',
  });

  function handleSort(column: SortColumn): void {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' }
    );
  }

  const sortedTasks: Task[] = tasks
    .map((task, index) => ({ task, index }))
    .toSorted(({ task: a, index: ai }, { task: b, index: bi }) => {
      const aVal = a[sort.column];
      const bVal = b[sort.column];
      const cmp =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal));
      if (cmp === 0) return ai - bi;
      return sort.direction === 'asc' ? cmp : -cmp;
    })
    .map(({ task }) => task);

  return (
    <div className="w-full overflow-x-auto rounded-card border border-border-default bg-surface-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-default">
            {COLUMN_DEFS.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3 py-2.5 text-left text-xs font-semibold text-text-muted whitespace-nowrap',
                  col.sortable && 'cursor-pointer select-none hover:text-text-primary transition-colors'
                )}
                onClick={col.sortable ? () => handleSort(col.key as SortColumn) : undefined}
              >
                {col.sortable ? (
                  <span className="flex items-center gap-1">
                    {col.label}
                    {getSortIcon(col, sort)}
                  </span>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTasks.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-sm text-text-muted">
                No tasks match the current filters
              </td>
            </tr>
          ) : (
            sortedTasks.map((task) => (
              <tr
                key={task.id}
                className="border-b border-border-default last:border-0 hover:bg-surface-hover cursor-pointer transition-colors"
                onClick={() => onSelect(task.id)}
              >
                <td className="px-3 py-2.5">
                  <span
                    className={cn('inline-block w-2 h-2 rounded-full', STATUS_DOT_CONFIG[task.status])}
                    aria-label={task.status}
                  />
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-text-muted">{task.id}</td>
                <td className="px-3 py-2.5 text-text-primary">{task.title}</td>
                <td className="px-3 py-2.5 text-text-secondary lowercase">{task.owner}</td>
                <td className="px-3 py-2.5 text-text-secondary lowercase">{task.app}</td>
                <td className={cn('px-3 py-2.5', PRIORITY_COLOR[task.priority])}>{task.priority}</td>
                <td className="px-3 py-2.5 text-xs text-text-muted">
                  {task.dependencies.length > 0 ? task.dependencies.join(', ') : '—'}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-text-secondary">{task.estimatedHours}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-text-secondary">{task.actualHours}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
