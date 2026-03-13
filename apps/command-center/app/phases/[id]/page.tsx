import type React from 'react';
import Link from 'next/link';
import { getPhases } from '@/lib/data';
import { calculateProgress, groupBy } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { Card } from '@/ui/Card';
import { StatusBadge } from '@/ui/StatusBadge';
import { ProgressBar } from '@/ui/ProgressBar';
import { BurndownChart } from '@/components/BurndownChart';
import { cn } from '@/theme/utils';

interface PhaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PhaseDetail({ params }: PhaseDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const project = await getPhases();
  const phase = project?.phases.find((p) => String(p.id) === id);

  if (!phase) {
    return (
      <div>
        <Link href="/phases" className="text-sm text-blue-400 hover:underline">&larr; Back to phases</Link>
        <Card className="mt-4 flex flex-col gap-2">
          <span className="font-mono text-xs bg-zinc-800 rounded px-2 py-0.5 w-fit text-text-secondary">P{id}</span>
          <p className="text-text-muted">Phase not found.</p>
        </Card>
      </div>
    );
  }

  const done = phase.tasks.filter((t) => t.status === 'done').length;
  const total = phase.tasks.length;
  const progress = calculateProgress(done, total);
  const tasksByApp = groupBy(phase.tasks, 'app');
  const blockedTasks = phase.tasks.filter((t) => t.status === 'blocked');
  const allTasks = project?.phases.flatMap((p) => p.tasks) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/phases" className="text-sm text-blue-400 hover:underline w-fit">&larr; Back to phases</Link>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs bg-zinc-800 rounded px-2 py-0.5 w-fit text-text-secondary">P{phase.id}</span>
            <h1 className="text-2xl font-bold text-text-primary">{phase.title}</h1>
            <p className="text-sm text-text-secondary">{phase.description}</p>
          </div>
          <span className="shrink-0 font-mono text-5xl font-bold text-text-primary">{progress}%</span>
        </div>
        <div className="mt-3">
          <ProgressBar value={progress} showLabel={false} />
        </div>
      </div>

      {/* Burndown chart — Recharts AreaChart */}
      <Card>
        <p className="text-xs uppercase tracking-wider text-text-muted mb-3">Burndown</p>
        <BurndownChart tasks={phase.tasks} />
      </Card>

      {/* Blocked tasks */}
      <Card>
        <p className="text-xs uppercase tracking-wider text-text-muted mb-3">Blocked Tasks</p>
        {blockedTasks.length === 0 ? (
          <p className="text-sm text-text-muted">No blocked tasks in this phase.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {blockedTasks.map((task) => {
              const deps = task.dependencies
                .map((depId) => allTasks.find((t) => t.id === depId))
                .filter((dep): dep is Task => dep != null);
              return (
                <div key={task.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-muted">{task.id}</span>
                    <StatusBadge status={task.status} />
                    <span className="text-sm text-text-primary">{task.title}</span>
                  </div>
                  {deps.length > 0 && (
                    <ul className="mt-1 ml-4 flex flex-col gap-1">
                      {deps.map((dep) => (
                        <li key={dep.id} className="flex items-center gap-2">
                          <span className={cn('text-xs', dep.status === 'done' ? 'text-green-500' : 'text-red-500')}>
                            ●
                          </span>
                          <span className="text-xs text-text-secondary">{dep.title}</span>
                          <StatusBadge status={dep.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Full task table grouped by app */}
      {Object.entries(tasksByApp)
        .toSorted(([a], [b]) => a.localeCompare(b))
        .map(([app, tasks]) => (
          <div key={app}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted">
              <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs normal-case text-text-secondary">
                {app}
              </span>
              <span className="font-mono text-xs font-normal text-text-muted">{tasks.length}</span>
            </h2>
            <div className="overflow-x-auto rounded-card border border-zinc-800">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">ID</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">Status</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">Title</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">Priority</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-zinc-800 last:border-b-0 transition-colors hover:bg-zinc-800/50"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-text-muted whitespace-nowrap">{task.id}</td>
                      <td className="px-3 py-2"><StatusBadge status={task.status} /></td>
                      <td className="px-3 py-2 text-sm text-text-primary">{task.title}</td>
                      <td className="px-3 py-2 font-mono text-[10px] uppercase text-text-muted whitespace-nowrap">{task.priority}</td>
                      <td className="px-3 py-2 font-mono text-xs text-text-muted whitespace-nowrap">{task.estimatedHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}
