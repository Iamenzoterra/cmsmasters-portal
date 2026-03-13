import type React from 'react';
import Link from 'next/link';
import { getPhases } from '@/lib/data';
import { calculateProgress } from '@/lib/utils';
import { Card } from '@/ui/Card';
import { ProgressBar } from '@/ui/ProgressBar';
import { TaskBrowser, type PhaseTask } from '@/components/TaskBrowser';

export default async function PhaseTracker(): Promise<React.ReactElement> {
  const project = await getPhases();

  if (!project) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Phase Tracker</h1>
        <p className="mt-4 text-text-muted">phases.json not found.</p>
      </div>
    );
  }

  const allTasks: PhaseTask[] = project.phases.flatMap((p) =>
    p.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      owner: t.owner,
      app: t.app,
      status: t.status,
      priority: (t.priority === 'critical' ? 'high' : t.priority) as 'high' | 'medium' | 'low',
      dependencies: t.dependencies,
      estimatedHours: t.estimatedHours,
      actualHours: t.actualHours ?? 0,
      phase: String(p.id),
    }))
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{project.title ?? 'Phase Tracker'}</h1>
        <p className="mt-1 text-sm text-text-secondary">{project.description}</p>
        <p className="mt-1 font-mono text-xs text-text-muted">
          {project.phases.length} phases &middot; {project.phases.reduce((s, p) => s + p.tasks.length, 0)} tasks
        </p>
      </div>

      <div className="grid gap-4">
        {project.phases.map((phase) => {
          const done = phase.tasks.filter((t) => t.status === 'done').length;
          const inProgress = phase.tasks.filter((t) => t.status === 'in-progress').length;
          const blocked = phase.tasks.filter((t) => t.status === 'blocked').length;
          const todo = phase.tasks.length - done - inProgress - blocked;
          const progress = calculateProgress(done, phase.tasks.length);

          return (
            <Link key={phase.id} href={`/phases/${phase.id}`}>
              <Card className="group">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-xs text-text-secondary">
                        P{phase.id}
                      </span>
                      <h2 className="truncate text-lg font-bold text-text-primary group-hover:text-blue-400 transition-colors">
                        {phase.title}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary line-clamp-2">{phase.description}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-text-muted">
                    {phase.tasks.length} tasks
                  </span>
                </div>

                <div className="mt-4">
                  <ProgressBar value={progress} />
                </div>

                <div className="mt-3 flex gap-4 font-mono text-xs">
                  {done > 0 && <span className="text-green-400">{done} done</span>}
                  {inProgress > 0 && <span className="text-blue-400">{inProgress} in-progress</span>}
                  {blocked > 0 && <span className="text-red-400">{blocked} blocked</span>}
                  {todo > 0 && <span className="text-zinc-400">{todo} todo</span>}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold text-text-primary">All Tasks</h2>
        <TaskBrowser tasks={allTasks} />
      </div>
    </div>
  );
}
