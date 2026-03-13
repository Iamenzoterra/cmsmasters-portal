import type React from 'react';
import Link from 'next/link';
import { getPhases } from '@/lib/data';
import type { Task, TaskStatus } from '@/lib/types';
import { StatusBadge } from '@/ui/StatusBadge';
import { ProgressBar } from '@/ui/ProgressBar';
import { cn } from '@/theme/utils';
import { calculateProgress, formatHours, formatDate } from '@/lib/utils';
import { ChevronDown, X, Search } from 'lucide-react';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function filterTasks(tasks: Task[], statuses: TaskStatus[], search: string): Task[] {
  let result = tasks;
  if (statuses.length > 0) {
    result = result.filter((t) => statuses.includes(t.status));
  }
  if (search) {
    const lower = search.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.id.toLowerCase().includes(lower),
    );
  }
  return result;
}

function buildHref(
  overrides: Record<string, string | null>,
  base: Record<string, string>,
): string {
  const merged: Record<string, string | null> = { ...base, ...overrides };
  const filtered = Object.entries(merged).filter(
    (entry): entry is [string, string] => entry[1] !== null && entry[1] !== '',
  );
  if (filtered.length === 0) return '?';
  const qs = new URLSearchParams(filtered).toString();
  return `?${qs}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review', 'done', 'blocked'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    statuses?: string;
    search?: string;
    task?: string;
  }>;
}

export default async function PhaseTracker(props: PageProps): Promise<React.ReactElement> {
  const searchParams = await props.searchParams;

  const activeStatuses = (searchParams.statuses ?? '')
    .split(',')
    .filter(Boolean) as TaskStatus[];
  const searchTerm = searchParams.search ?? '';
  const selectedTaskId = searchParams.task ?? null;

  const project = await getPhases();

  if (!project) {
    return (
      <div className="bg-surface-card border border-zinc-800 rounded-card p-card">
        <h1 className="text-2xl font-bold text-text-primary">Phase Tracker</h1>
        <p className="mt-4 text-sm text-text-muted">
          <code className="font-mono text-xs bg-zinc-800 px-1 py-0.5 rounded">
            workplan/phases.json
          </code>{' '}
          not found. Add this file to the monorepo to see phase data.
        </p>
      </div>
    );
  }

  // Build current params for href construction
  const currentParams: Record<string, string> = {};
  if (activeStatuses.length > 0) currentParams.statuses = activeStatuses.join(',');
  if (searchTerm) currentParams.search = searchTerm;
  if (selectedTaskId) currentParams.task = selectedTaskId;

  // Find the selected task across all phases
  const allTasks = project.phases.flatMap((p) => p.tasks);
  const selectedTask = selectedTaskId
    ? (allTasks.find((t) => t.id === selectedTaskId) ?? null)
    : null;

  const hasFilters = activeStatuses.length > 0 || searchTerm.length > 0;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          {project.title ?? 'Phase Tracker'}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{project.description}</p>
        <p className="mt-1 font-mono text-xs text-text-muted">
          {project.phases.length} phases &middot; {allTasks.length} tasks
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        {/* Search form — preserves status filters on submit */}
        <form method="get">
          {activeStatuses.length > 0 && (
            <input type="hidden" name="statuses" value={activeStatuses.join(',')} />
          )}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            <input
              type="search"
              name="search"
              defaultValue={searchTerm}
              placeholder="Search tasks…"
              className="pl-8 pr-3 py-1.5 text-sm bg-zinc-900 border border-zinc-700 rounded-badge text-text-primary placeholder:text-text-muted focus:outline-none focus:border-zinc-500 w-48"
            />
          </div>
        </form>

        {/* Status chips — each toggles that status in/out of active filters */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((status) => {
            const isActive = activeStatuses.includes(status);
            const newStatuses = isActive
              ? activeStatuses.filter((s) => s !== status)
              : [...activeStatuses, status];
            const href = buildHref(
              { statuses: newStatuses.length > 0 ? newStatuses.join(',') : null },
              currentParams,
            );
            return (
              <Link
                key={status}
                href={href}
                className={cn(
                  'px-2.5 py-1 rounded-badge text-xs font-medium transition-colors border',
                  !isActive &&
                    'bg-zinc-800 text-text-muted border-zinc-700 hover:bg-zinc-700',
                  isActive &&
                    status === 'done' &&
                    'bg-green-500/20 text-green-400 border-green-500/40',
                  isActive &&
                    status === 'in-progress' &&
                    'bg-blue-500/20 text-blue-400 border-blue-500/40',
                  isActive &&
                    status === 'review' &&
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
                  isActive &&
                    status === 'blocked' &&
                    'bg-red-500/20 text-red-400 border-red-500/40',
                  isActive &&
                    status === 'todo' &&
                    'bg-zinc-500/20 text-zinc-400 border-zinc-500/40',
                )}
              >
                {STATUS_LABELS[status]}
              </Link>
            );
          })}
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <Link
            href="?"
            className="flex items-center gap-1 px-2.5 py-1 rounded-badge text-xs text-text-muted hover:text-text-primary bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </Link>
        )}
      </div>

      {/* Phases grid */}
      <div className="grid gap-4">
        {project.phases.map((phase) => {
          const done = phase.tasks.filter((t) => t.status === 'done').length;
          const inProg = phase.tasks.filter((t) => t.status === 'in-progress').length;
          const blocked = phase.tasks.filter((t) => t.status === 'blocked').length;
          const review = phase.tasks.filter((t) => t.status === 'review').length;
          const todo = phase.tasks.filter((t) => t.status === 'todo').length;

          // Open by default if phase is in-progress (has started but isn't complete)
          const isDefaultOpen =
            (inProg > 0 || done > 0) &&
            !(phase.tasks.length > 0 && done === phase.tasks.length);

          const filteredTasks = filterTasks(phase.tasks, activeStatuses, searchTerm);
          const progress = calculateProgress(done, phase.tasks.length);

          let taskListContent: React.ReactNode;
          if (filteredTasks.length === 0 && phase.tasks.length > 0) {
            taskListContent = (
              <p className="text-sm text-text-muted italic py-4 text-center">
                No tasks match the current filters.
              </p>
            );
          } else if (filteredTasks.length === 0) {
            taskListContent = (
              <p className="text-sm text-text-muted italic py-4 text-center">
                No tasks in this phase yet.
              </p>
            );
          } else {
            taskListContent = (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-zinc-800">
                    <th className="font-mono text-xs text-text-muted pb-2 pr-4 w-24">ID</th>
                    <th className="font-mono text-xs text-text-muted pb-2 pr-4 w-28">Status</th>
                    <th className="font-mono text-xs text-text-muted pb-2 pr-4">Title</th>
                    <th className="font-mono text-xs text-text-muted pb-2 pr-4 w-32">Owner</th>
                    <th className="font-mono text-xs text-text-muted pb-2 w-20">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const taskHref = buildHref({ task: task.id }, currentParams);
                    return (
                      <tr
                        key={task.id}
                        className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="py-2 pr-4">
                          <Link
                            href={taskHref}
                            className="font-mono text-xs text-text-muted hover:text-text-secondary"
                          >
                            {task.id}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">
                          <Link href={taskHref}>
                            <StatusBadge status={task.status} />
                          </Link>
                        </td>
                        <td className="py-2 pr-4">
                          <Link
                            href={taskHref}
                            className="text-text-primary hover:text-text-secondary line-clamp-1"
                          >
                            {task.title}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">
                          <Link href={taskHref} className="font-mono text-xs text-text-muted">
                            {task.owner}
                          </Link>
                        </td>
                        <td className="py-2">
                          <Link
                            href={taskHref}
                            className={cn(
                              'font-mono text-xs',
                              task.priority === 'critical' && 'text-red-500',
                              task.priority === 'high' && 'text-orange-500',
                              task.priority === 'medium' && 'text-yellow-500',
                              task.priority === 'low' && 'text-zinc-400',
                            )}
                          >
                            {task.priority}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          }

          return (
            <details
              key={String(phase.id)}
              className="group bg-surface-card border border-zinc-800 rounded-card overflow-hidden"
              open={isDefaultOpen ? true : undefined}
            >
              <summary className="list-none cursor-pointer p-card select-none">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Phase ID badge */}
                  <span className="font-mono text-xs bg-zinc-800 text-text-muted px-2 py-0.5 rounded-badge shrink-0">
                    P{phase.id}
                  </span>

                  {/* Phase title */}
                  <span className="font-semibold text-text-primary flex-1 min-w-0">
                    {phase.title}
                  </span>

                  {/* Status count pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {done > 0 && (
                      <span className="font-mono text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-badge">
                        {done} done
                      </span>
                    )}
                    {inProg > 0 && (
                      <span className="font-mono text-xs bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-badge">
                        {inProg} in-progress
                      </span>
                    )}
                    {blocked > 0 && (
                      <span className="font-mono text-xs bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-badge">
                        {blocked} blocked
                      </span>
                    )}
                    {review > 0 && (
                      <span className="font-mono text-xs bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded-badge">
                        {review} review
                      </span>
                    )}
                    {todo > 0 && (
                      <span className="font-mono text-xs bg-zinc-500/10 text-zinc-400 px-1.5 py-0.5 rounded-badge">
                        {todo} todo
                      </span>
                    )}
                  </div>

                  {/* Chevron rotates when details is open */}
                  <ChevronDown className="h-4 w-4 text-text-muted shrink-0 transition-transform group-open:rotate-180" />
                </div>

                {/* Progress bar — always visible inside summary */}
                <div className="mt-3">
                  <ProgressBar value={progress} showLabel />
                </div>
              </summary>

              {/* Expanded task list */}
              <div className="px-card pb-card">
                <div className="border-t border-zinc-800 pt-4">
                  {taskListContent}
                </div>
              </div>
            </details>
          );
        })}
      </div>

      {/* Task Detail Sheet */}
      {selectedTask !== null && (
        <>
          {/* Backdrop */}
          <Link
            href={buildHref({ task: null }, currentParams)}
            className="fixed inset-0 bg-black/50 z-40"
            aria-label="Close task detail"
          />

          {/* Detail panel */}
          <div className="task-detail-sheet fixed right-0 top-0 h-full w-96 md:w-[480px] bg-surface-card border-l border-zinc-800 z-50 overflow-y-auto p-6">
            <style>{`
              .task-detail-sheet {
                transform: translateX(0);
                transition: transform 300ms cubic-bezier(0.4,0,0.2,1);
              }
              @starting-style {
                .task-detail-sheet {
                  transform: translateX(100%);
                }
              }
            `}</style>

            {/* Header row: task ID + close button */}
            <div className="flex items-start justify-between mb-4">
              <span className="font-mono text-xs bg-zinc-800 text-text-muted px-2 py-0.5 rounded-badge">
                {selectedTask.id}
              </span>
              <Link
                href={buildHref({ task: null }, currentParams)}
                className="text-text-muted hover:text-text-primary transition-colors p-1 -mr-1 -mt-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Link>
            </div>

            <h2 className="text-lg font-bold text-text-primary mb-3">{selectedTask.title}</h2>

            {/* Status badge */}
            <div className="mb-4">
              <StatusBadge status={selectedTask.status} />
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 font-mono text-xs text-text-muted">
              <span>owner: {selectedTask.owner}</span>
              <span>app: {selectedTask.app}</span>
              <span>priority: {selectedTask.priority}</span>
            </div>

            {/* Hours */}
            <div className="flex gap-4 mb-4 font-mono text-xs text-text-muted">
              <span>est: {formatHours(selectedTask.estimatedHours)}</span>
              {selectedTask.actualHours != null && (
                <span>actual: {formatHours(selectedTask.actualHours)}</span>
              )}
            </div>

            {/* Description */}
            {selectedTask.description && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                  Description
                </p>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {selectedTask.description}
                </p>
              </div>
            )}

            {/* Acceptance Criteria */}
            {selectedTask.acceptanceCriteria.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  Acceptance Criteria
                </p>
                <ul className="space-y-1.5">
                  {selectedTask.acceptanceCriteria.map((criterion, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dependencies */}
            {selectedTask.dependencies.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  Dependencies
                </p>
                <ul className="space-y-1">
                  {selectedTask.dependencies.map((dep) => (
                    <li key={dep} className="font-mono text-xs text-text-muted">
                      {dep}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            {selectedTask.notes && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                  Notes
                </p>
                <p className="text-sm text-text-secondary leading-relaxed">{selectedTask.notes}</p>
              </div>
            )}

            {/* Dates */}
            <div className="mt-6 pt-4 border-t border-zinc-800 font-mono text-xs text-text-muted space-y-1">
              <div>created: {formatDate(selectedTask.createdAt)}</div>
              {selectedTask.completedAt && (
                <div>completed: {formatDate(selectedTask.completedAt)}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
