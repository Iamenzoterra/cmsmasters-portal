'use client';

import React, { useState } from 'react';
import { cn } from '../theme/utils';
import { PhaseTimeline } from './PhaseTimeline';
import type { PhaseBlock } from './PhaseTimeline';
import type { PackageNode, AppNode, DependencyEdge } from '../lib/types';

export interface DependencyGraphProps {
  phases: PhaseBlock[];
  packages: PackageNode[];
  apps: AppNode[];
  edges: DependencyEdge[];
}

export function DependencyGraph({ phases, packages, apps, edges }: DependencyGraphProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'packages' | 'phases'>('packages');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  function handleNodeClick(id: string): void {
    setSelectedNode((prev) => (prev === id ? null : id));
  }

  // Determine which nodes are connected to the selected node
  function isConnected(id: string): boolean {
    if (!selectedNode) return false;
    return edges.some(
      (e) => (e.from === selectedNode && e.to === id) || (e.to === selectedNode && e.from === id),
    );
  }

  function getNodeClasses(id: string): string {
    const base = 'cursor-pointer rounded-card px-4 py-2 font-mono text-sm border transition-all';
    if (selectedNode === id) {
      return cn(base, 'border-blue-500 ring-2 ring-blue-500/30 text-text-primary bg-surface-card');
    }
    if (selectedNode && isConnected(id)) {
      return cn(base, 'border-blue-500/50 text-text-primary bg-surface-card');
    }
    if (selectedNode) {
      return cn(base, 'border-border-default bg-surface-card text-text-secondary opacity-30');
    }
    return cn(base, 'border-border-default bg-surface-card text-text-secondary hover:bg-surface-hover');
  }

  // Info panel content
  let infoTitle = '';
  let infoItems: string[] = [];
  if (selectedNode) {
    const isPkg = packages.some((p) => p.id === selectedNode);
    if (isPkg) {
      infoTitle = 'Affects:';
      infoItems = edges
        .filter((e) => e.from === selectedNode)
        .map((e) => apps.find((a) => a.id === e.to)?.label ?? e.to);
    } else {
      infoTitle = 'Depends on:';
      infoItems = edges
        .filter((e) => e.to === selectedNode)
        .map((e) => packages.find((p) => p.id === e.from)?.label ?? e.from);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border-default">
        {(['packages', 'phases'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              setSelectedNode(null);
            }}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'bg-surface-hover text-text-primary border-border-focus'
                : 'text-text-secondary border-transparent hover:text-text-primary',
            )}
          >
            {tab === 'packages' ? 'Package Dependencies' : 'Phase Dependencies'}
          </button>
        ))}
      </div>

      {/* Package Dependencies view */}
      {activeTab === 'packages' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-8">
            {/* Packages column */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono mb-1">
                Packages
              </p>
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => handleNodeClick(pkg.id)}
                  className={getNodeClasses(pkg.id)}
                >
                  {pkg.label}
                </button>
              ))}
            </div>

            {/* Apps column */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono mb-1">
                Apps
              </p>
              {apps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleNodeClick(app.id)}
                  className={getNodeClasses(app.id)}
                >
                  {app.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info panel */}
          {selectedNode !== null && infoItems.length > 0 && (
            <div className="bg-surface-card border border-border-default rounded-card p-3 max-w-sm">
              <p className="text-xs text-text-secondary mb-1.5">{infoTitle}</p>
              <div className="flex flex-wrap gap-1">
                {infoItems.map((item) => (
                  <span
                    key={item}
                    className="text-xs font-mono text-text-primary bg-surface-hover px-2 py-0.5 rounded-badge"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase Dependencies view */}
      {activeTab === 'phases' && phases.length > 0 && (
        <PhaseTimeline phases={phases} overallLabel={`${phases.length} phases`} />
      )}

      {activeTab === 'phases' && phases.length === 0 && (
        <p className="text-text-secondary text-sm py-8 text-center font-mono">
          No phase data available.
        </p>
      )}
    </div>
  );
}
