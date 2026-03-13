import type React from 'react';
import { getPhases } from '@/lib/data';
import { PhaseCard } from '@/components/PhaseCard';
import type { PhaseStatus } from '@/lib/types';

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{project.title ?? 'Phase Tracker'}</h1>
        <p className="mt-1 text-sm text-text-secondary">{project.description}</p>
        <p className="mt-1 font-mono text-xs text-text-muted">
          {project.phases.length} phases &middot;{' '}
          {project.phases.reduce((s, p) => s + p.tasks.length, 0)} tasks
        </p>
      </div>

      <div className="grid gap-4">
        {project.phases.map((phase) => {
          const done = phase.tasks.filter((t) => t.status === 'done').length;
          const inProg = phase.tasks.filter((t) => t.status === 'in-progress').length;

          let derivedStatus: PhaseStatus = 'todo';
          if (phase.tasks.length > 0 && done === phase.tasks.length) {
            derivedStatus = 'done';
          } else if (inProg > 0 || done > 0) {
            derivedStatus = 'in-progress';
          }

          const totalHours = phase.tasks.reduce(
            (sum, t) => sum + ((t as { estimatedHours?: number }).estimatedHours ?? 0),
            0,
          );
          const estimatedWeeks = totalHours > 0 ? Math.ceil(totalHours / 40) : undefined;

          return (
            <PhaseCard
              key={String(phase.id)}
              phase={{ ...phase, status: derivedStatus }}
              tasks={phase.tasks}
              defaultExpanded={derivedStatus === 'in-progress'}
              estimatedWeeks={estimatedWeeks}
            />
          );
        })}
      </div>
    </div>
  );
}
