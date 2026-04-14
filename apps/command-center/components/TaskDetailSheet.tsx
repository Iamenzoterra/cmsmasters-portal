'use client';

import { useEffect } from 'react';
import { X, CheckSquare, Square, Calendar, Hash, Link2, User, Tag } from 'lucide-react';
import type { Task } from '@/lib/types';
import { cn } from '@/theme/utils';
import { StatusBadge } from '@/ui/StatusBadge';
import { formatDate } from '@/lib/utils';

interface TaskDetailSheetProps {
  task: Task | null;
  onClose: () => void;
  onTaskSelect?: (taskId: string) => void;
  allTasks?: Task[];
}

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'text-red-400 bg-red-900/30',
  high: 'text-orange-400 bg-orange-900/30',
  medium: 'text-yellow-400 bg-yellow-900/30',
  low: 'text-green-400 bg-green-900/30',
};

export function TaskDetailSheet({
  task,
  onClose,
  onTaskSelect,
  allTasks,
}: TaskDetailSheetProps): React.JSX.Element {
  useEffect(() => {
    if (!task) return;
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [task, onClose]);

  const isOpen = task !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide panel */}
      <div
        role="dialog"
        aria-modal={isOpen}
        aria-label={task?.title ?? 'Task detail'}
        className={cn(
          'fixed right-0 top-0 h-full w-[480px] z-50',
          'bg-surface-card border-l border-border-default',
          'flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border-default sticky top-0 bg-surface-card z-10">
          <div className="flex flex-col gap-1.5 min-w-0">
            <h2 className="text-sm font-semibold text-text-primary truncate leading-tight">
              {task?.title ?? ''}
            </h2>
            {task && <StatusBadge status={task.status} />}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-text-muted hover:text-text-primary transition-colors p-1 -mr-1"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {task && (
          <div className="overflow-y-auto flex-1 divide-y divide-border-default">
            {/* Description */}
            <section className="px-5 py-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Description
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">
                {task.description || '—'}
              </p>
            </section>

            {/* Meta */}
            <section className="px-5 py-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Details
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-badge bg-surface-hover text-text-secondary text-xs">
                  <User className="w-3 h-3 text-text-muted" />
                  {task.owner}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-badge bg-surface-hover text-text-secondary text-xs">
                  <Tag className="w-3 h-3 text-text-muted" />
                  {task.app}
                </span>
                <span
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-badge text-xs',
                    PRIORITY_STYLE[task.priority] ?? 'text-text-secondary bg-surface-hover'
                  )}
                >
                  {task.priority}
                </span>
              </div>
            </section>

            {/* Dependencies */}
            {task.dependencies.length > 0 && (
              <section className="px-5 py-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Dependencies
                </p>
                <ul className="flex flex-col gap-1.5">
                  {task.dependencies.map((depId) => {
                    const depTask = allTasks?.find((t) => t.id === depId);
                    return (
                      <li key={depId}>
                        <button
                          onClick={() => onTaskSelect?.(depId)}
                          className={cn(
                            'flex items-center gap-2 w-full text-left',
                            'px-2.5 py-1.5 rounded-badge',
                            'bg-surface-hover hover:bg-border-default transition-colors',
                            onTaskSelect ? 'cursor-pointer' : 'cursor-default'
                          )}
                        >
                          <Hash className="w-3 h-3 text-text-muted shrink-0" />
                          <span className="font-mono text-xs text-text-muted shrink-0">{depId}</span>
                          {depTask && (
                            <>
                              <span className="text-text-disabled text-xs">—</span>
                              <span className="text-xs text-text-secondary truncate">
                                {depTask.title}
                              </span>
                            </>
                          )}
                          {onTaskSelect && (
                            <Link2 className="w-3 h-3 text-text-muted ml-auto shrink-0" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Acceptance Criteria */}
            {task.acceptanceCriteria.length > 0 && (
              <section className="px-5 py-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Acceptance Criteria
                </p>
                <ul className="flex flex-col gap-2">
                  {task.acceptanceCriteria.map((criterion, i) => {
                    const isDone = task.status === 'done';
                    return (
                      <li key={i} className="flex items-start gap-2">
                        {isDone ? (
                          <CheckSquare className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                        )}
                        <span className="text-sm text-text-secondary leading-snug">
                          {criterion}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Notes */}
            {task.notes && task.notes.trim().length > 0 && (
              <section className="px-5 py-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Notes
                </p>
                <pre className="text-sm text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
                  {task.notes}
                </pre>
              </section>
            )}

            {/* Timestamps */}
            <section className="px-5 py-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Timestamps
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-text-muted shrink-0" />
                  <span className="text-xs text-text-muted w-20">Created</span>
                  <span className="font-mono text-xs text-text-secondary">
                    {formatDate(task.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-text-muted shrink-0" />
                  <span className="text-xs text-text-muted w-20">Started</span>
                  <span className="font-mono text-xs text-text-secondary">
                    {(() => {
                      const startedAt = (task as Task & { startedAt?: string }).startedAt;
                      return startedAt ? formatDate(startedAt) : '—';
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-text-muted shrink-0" />
                  <span className="text-xs text-text-muted w-20">Completed</span>
                  <span className="font-mono text-xs text-text-secondary">
                    {task.completedAt ? formatDate(task.completedAt) : '—'}
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
