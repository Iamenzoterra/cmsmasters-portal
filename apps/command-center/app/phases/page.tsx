import type React from 'react';
import { getPhases } from '@/lib/data';
import { PhaseTrackerClient } from '@/components/PhaseTrackerClient';

export default async function PhaseTracker(): Promise<React.ReactElement> {
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

  return <PhaseTrackerClient project={project} />;
}
