import type React from 'react';
import Link from 'next/link';
import { getPhases } from '@/lib/data';
import { groupBy } from '@/lib/utils';
import { Card } from '@/ui/Card';
import { StatusBadge } from '@/ui/StatusBadge';

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
        <h1 className="mt-4 text-2xl font-bold text-text-primary">Phase not found</h1>
      </div>
    );
  }

  const tasksByApp = groupBy(phase.tasks, 'app' as keyof (typeof phase.tasks)[0]);

  return (
    <div>
      <Link href="/phases" className="text-sm text-blue-400 hover:underline">&larr; Back to phases</Link>

      <div className="mt-4 mb-8">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-xs text-text-secondary">P{phase.id}</span>
          <h1 className="text-2xl font-bold text-text-primary">{phase.title}</h1>
        </div>
        <p className="mt-1 text-sm text-text-secondary">{phase.description}</p>
        <p className="mt-1 font-mono text-xs text-text-muted">{phase.tasks.length} tasks</p>
      </div>

      {Object.entries(tasksByApp)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([app, tasks]) => (
          <div key={app} className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted">
              <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs normal-case text-text-secondary">
                {app}
              </span>
              <span className="font-mono text-xs font-normal text-text-muted">{tasks.length}</span>
            </h2>

            <div className="grid gap-2">
              {tasks.map((task) => (
                <Card key={task.id} className="!p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 font-mono text-xs text-text-muted">{task.id}</span>
                        <StatusBadge status={task.status} />
                      </div>
                      <p className="mt-1 text-sm font-medium text-text-primary">{task.title}</p>
                      <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{task.description}</p>
                    </div>
                    {'priority' in task && (
                      <span className="shrink-0 font-mono text-[10px] uppercase text-text-muted">
                        {String(task.priority ?? '')}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
