'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Phase, Task } from '@/lib/types';
import { ProgressBar } from '../ui/ProgressBar';
import { cn, getStatusColor, getStatusBg } from '../theme/utils';

interface PhaseCardProps {
  phase: Phase;
  tasks: Task[];
  defaultExpanded?: boolean;
  estimatedWeeks?: number;
  startDate?: string;
  endDate?: string;
  onTaskSelect?: (task: Task) => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-zinc-400',
};

export function PhaseCard({
  phase,
  tasks,
  defaultExpanded = false,
  estimatedWeeks,
  startDate,
  endDate,
  onTaskSelect,
}: PhaseCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const phaseMatch = /phase-(\d+)/i.exec(phase.id);
  const phaseLabel = phaseMatch ? phaseMatch[1] : phase.id;

  const doneTasks = tasks.filter((t) => t.status === 'done');
  const progressPct = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  return (
    <div
      className={cn(
        'bg-surface-card rounded-card border border-border-subtle',
        phase.status === 'in-progress' && 'ring-1 ring-accent/40'
      )}
    >
      <button
        type="button"
        className="w-full flex items-start justify-between gap-4 p-card text-left"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="font-mono text-xs border border-border-default text-text-muted rounded-badge px-1.5 py-0.5 shrink-0">
            {phaseLabel}
          </span>
          <div className="min-w-0">
            <p className="text-text-primary font-semibold text-sm">{phase.title}</p>
            {phase.description && (
              <p className="text-text-secondary text-xs mt-0.5 leading-snug">{phase.description}</p>
            )}
          </div>
        </div>
        <span className="shrink-0 text-text-muted mt-0.5">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
      </button>

      <div className="px-card pb-3 flex items-center gap-3">
        <ProgressBar value={progressPct} className="flex-1" />
        <span className="font-mono text-xs text-text-secondary shrink-0">
          {doneTasks.length} / {tasks.length} tasks
        </span>
      </div>

      {(estimatedWeeks !== undefined || startDate !== undefined || endDate !== undefined) && (
        <div className="px-card pb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-text-secondary">
          {estimatedWeeks !== undefined && <span>~{estimatedWeeks}w estimated</span>}
          {(startDate !== undefined || endDate !== undefined) && (
            <span>
              {startDate ?? '?'} → {endDate ?? '?'}
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden min-h-0">
          <div className="border-t border-border-subtle">
            {tasks.length === 0 ? (
              <p className="px-card py-6 text-center text-sm text-text-muted">No tasks in this phase</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted">ID</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted">Title</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted">Status</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted">Owner</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr
                        key={task.id}
                        className={cn(
                          'border-b border-border-default last:border-0 transition-colors',
                          onTaskSelect && 'hover:bg-surface-hover cursor-pointer'
                        )}
                        onClick={onTaskSelect ? () => onTaskSelect(task) : undefined}
                      >
                        <td className="px-3 py-2.5 font-mono text-xs text-text-muted">{task.id}</td>
                        <td className="px-3 py-2.5 text-text-primary">{task.title}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              'inline-flex items-center px-1.5 py-0.5 rounded-badge text-xs font-medium',
                              getStatusColor(task.status),
                              getStatusBg(task.status)
                            )}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-text-secondary lowercase text-xs">{task.owner}</td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-xs',
                            PRIORITY_COLOR[task.priority] ?? 'text-zinc-400'
                          )}
                        >
                          {task.priority}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
