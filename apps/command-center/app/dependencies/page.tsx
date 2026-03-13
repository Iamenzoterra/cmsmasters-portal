import fs from 'node:fs/promises';
import path from 'node:path';

import type React from 'react';
import { getPhaseBlocks } from '@/lib/data';
import { DependencyGraph } from '@/components/DependencyGraph';

// ─── Monorepo path constants ──────────────────────────────────────────────────

const MONOREPO_ROOT = path.resolve(process.cwd(), '..', '..');

// ADR-017: canonical list of workspace apps and packages
const SPEC_APPS = ['command-center', 'portal', 'dashboard', 'support', 'studio', 'admin', 'api'];
const SPEC_PACKAGES = ['ui', 'db', 'auth', 'api-client', 'validators', 'email'];

const APP_PKG_PATHS = SPEC_APPS.map((name) =>
  path.join(MONOREPO_ROOT, 'apps', name, 'package.json'),
);

const PKG_PKG_PATHS = SPEC_PACKAGES.map((name) =>
  path.join(MONOREPO_ROOT, 'packages', name, 'package.json'),
);

// ─── Package status probe ─────────────────────────────────────────────────────

interface PackageStatus {
  foundCount: number;
  totalExpected: number;
  isFallback: boolean;
  hasAny: boolean;
}

async function loadPackageStatus(): Promise<PackageStatus> {
  const allPaths = [...APP_PKG_PATHS, ...PKG_PKG_PATHS];
  const totalExpected = allPaths.length;

  const results = await Promise.allSettled(
    allPaths.map((p) => fs.access(p)),
  );

  const foundCount = results.filter((r) => r.status === 'fulfilled').length;
  const hasAny = foundCount > 0;
  const isFallback = foundCount < totalExpected;

  return { foundCount, totalExpected, isFallback, hasAny };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DependenciesPage(): Promise<React.ReactElement> {
  const [phaseData, packageStatus] = await Promise.all([
    getPhaseBlocks(),
    loadPackageStatus(),
  ]);

  // Empty state: no phase data and no package.json files found
  if (phaseData === null && !packageStatus.hasAny) {
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
          {phases.length} phase{phases.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Fallback notice */}
      {packageStatus.isFallback && (
        <div className="mb-4 border-l-2 border-amber-500 bg-amber-500/10 px-4 py-3 rounded-r-md flex items-start gap-2">
          <span className="text-amber-400 mt-0.5 shrink-0" aria-hidden="true">⚠</span>
          <p className="text-amber-400 text-sm">
            Showing placeholder structure —{' '}
            <span className="font-mono">{packageStatus.foundCount}</span> of{' '}
            <span className="font-mono">{packageStatus.totalExpected}</span> package.json files
            found. Create remaining workspace packages to see live data.
          </p>
        </div>
      )}

      {/* Dependency graph (client component — owns tab state) */}
      <DependencyGraph phases={phases} />
    </main>
  );
}
