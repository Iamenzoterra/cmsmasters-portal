import type React from 'react';
import { getPhaseBlocks, loadDependencyGraph } from '@/lib/data';
import { DependencyGraph } from '@/components/DependencyGraph';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DependenciesPage(): Promise<React.ReactElement> {
  const [phaseData, graphData] = await Promise.all([
    getPhaseBlocks(),
    loadDependencyGraph(),
  ]);

  // Empty state: no phase data and no package.json files found
  if (phaseData === null && graphData.foundCount === 0) {
    return (
      <main className="p-section flex items-center justify-center min-h-[50vh]">
        <div className="bg-surface-card rounded-card p-card text-center max-w-md w-full">
          <h1 className="text-text-primary text-xl font-semibold mb-2">Dependencies</h1>
          <p className="text-text-muted text-sm mb-1">No dependency data available</p>
          <p className="text-text-muted/60 text-sm">
            Run cc:scan or create package.json files to populate this view
          </p>
        </div>
      </main>
    );
  }

  const phases = phaseData?.phases ?? [];

  return (
    <main className="p-section">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-text-primary text-2xl font-semibold">Dependencies</h1>
        <p className="text-text-secondary font-mono text-sm mt-1">
          {phases.length} phase{phases.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Fallback notice */}
      {graphData.isFallback && (
        <div className="mb-4 border-l-2 border-amber-500 bg-amber-500/10 px-4 py-3 rounded-r-md flex items-start gap-2">
          <span className="text-amber-400 mt-0.5 shrink-0" aria-hidden="true">⚠</span>
          <p className="text-amber-400 text-sm">
            Showing placeholder structure —{' '}
            <span className="font-mono">{graphData.foundCount}</span> of{' '}
            <span className="font-mono">{graphData.totalExpected}</span> package.json files
            found. Create remaining workspace packages to see live data.
          </p>
        </div>
      )}

      {/* Dependency graph (client component — owns tab state) */}
      <DependencyGraph
        phases={phases}
        packages={graphData.packages}
        apps={graphData.apps}
        edges={graphData.edges}
      />
    </main>
  );
}
