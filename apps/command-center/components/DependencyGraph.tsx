'use client';

import React, { useState } from 'react';
import { cn } from '../theme/utils';
import { tokens } from '../theme/tokens';
import type { PhaseBlock } from './PhaseTimeline';

// Color constants derived from tokens — no inline hex strings in SVG attributes
const COLOR_NODE_FILL = tokens.surface.card;
const COLOR_NODE_STROKE_DEFAULT = tokens.border.default;
const COLOR_NODE_STROKE_SELECTED = tokens.border.focus;
const COLOR_TEXT_PRIMARY = tokens.text.primary;
const COLOR_TEXT_SECONDARY = tokens.text.secondary;
const COLOR_EDGE = tokens.status['in-progress'];
const COLOR_ARROW = tokens.color.zinc500;
const COLOR_TODO_FILL = tokens.color.zinc700;
const COLOR_TODO_STROKE = tokens.color.zinc600;
const COLOR_IN_PROGRESS = tokens.status['in-progress'];
const COLOR_DONE = tokens.status.done;
const COLOR_CONTENT = tokens.status.orchestrator;
const COLOR_BG = tokens.surface.app;

interface PackageNode {
  id: string;
  label: string;
  affectedApps: string[];
}

interface AppNode {
  id: string;
  label: string;
}

interface Edge {
  from: string;
  to: string;
}

const PACKAGES: PackageNode[] = [
  { id: 'ui', label: '@cms/ui', affectedApps: ['portal', 'dashboard', 'support', 'studio', 'admin', 'command-center'] },
  { id: 'db', label: '@cms/db', affectedApps: ['api'] },
  { id: 'auth', label: '@cms/auth', affectedApps: ['portal', 'dashboard', 'support', 'studio', 'admin', 'command-center', 'api'] },
  { id: 'validators', label: '@cms/validators', affectedApps: ['portal', 'dashboard', 'support', 'studio', 'admin', 'command-center', 'api'] },
  { id: 'email', label: '@cms/email', affectedApps: ['api'] },
  { id: 'api-client', label: '@cms/api-client', affectedApps: ['portal', 'dashboard', 'support', 'studio', 'admin', 'command-center'] },
];

const APPS: AppNode[] = [
  { id: 'portal', label: 'portal' },
  { id: 'dashboard', label: 'dashboard' },
  { id: 'support', label: 'support' },
  { id: 'studio', label: 'studio' },
  { id: 'admin', label: 'admin' },
  { id: 'command-center', label: 'command-center' },
  { id: 'api', label: 'api' },
];

const EDGES: Edge[] = PACKAGES.flatMap((pkg) =>
  pkg.affectedApps.map((appId) => ({ from: pkg.id, to: appId }))
);

// Package graph layout constants
const SVG_W = 900;
const SVG_H = 420;
const PKG_X = 20;
const PKG_W = 160;
const NODE_H = 32;
const APP_X = 720;
const APP_W = 160;
const MID_X = (PKG_X + PKG_W + APP_X) / 2;
const PKG_Y_START = 60;
const PKG_SPACING = 50;
const APP_Y_START = 60;
const APP_SPACING = 50;

// Phase timeline layout constants
const PHASE_SVG_W = 860;
const PHASE_SVG_H = 180;
const PHASE_PADDING_X = 20;
const PHASE_USABLE_W = 820;
const PHASE_BAR_H = 44;
const PHASE_BAR_Y = 40;
const CONTENT_BAR_Y = 110;
const CONTENT_BAR_H = 28;

const PKG_POSITIONS = PACKAGES.map((pkg, i) => ({
  ...pkg,
  x: PKG_X,
  y: PKG_Y_START + i * PKG_SPACING,
}));

const APP_POSITIONS = APPS.map((app, i) => ({
  ...app,
  x: APP_X,
  y: APP_Y_START + i * APP_SPACING,
}));

const MONO_FONT = 'var(--font-mono), ui-monospace, monospace';

function getPhaseFill(status: PhaseBlock['status']): string {
  if (status === 'done') return COLOR_DONE;
  if (status === 'in-progress') return COLOR_IN_PROGRESS;
  return COLOR_TODO_FILL;
}

function getPhaseStroke(status: PhaseBlock['status']): string {
  if (status === 'done') return COLOR_DONE;
  if (status === 'in-progress') return COLOR_IN_PROGRESS;
  return COLOR_TODO_STROKE;
}

function getPhaseFillOpacity(status: PhaseBlock['status']): number {
  return status === 'todo' ? 1 : 0.2;
}

export interface DependencyGraphProps {
  phases: PhaseBlock[];
}

export function DependencyGraph({ phases }: DependencyGraphProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'packages' | 'phases'>('packages');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  function getEdgeOpacity(edge: Edge): number {
    if (!selectedNode) return 0.3;
    if (edge.from === selectedNode || edge.to === selectedNode) return 1;
    return 0.05;
  }

  function handleNodeClick(id: string): void {
    setSelectedNode((prev) => (prev === id ? null : id));
  }

  // Tooltip content
  let tooltipTitle = '';
  let tooltipItems: string[] = [];
  if (selectedNode) {
    const isPkg = PKG_POSITIONS.some((p) => p.id === selectedNode);
    if (isPkg) {
      tooltipTitle = 'Affects:';
      tooltipItems = EDGES.filter((e) => e.from === selectedNode).map(
        (e) => APP_POSITIONS.find((a) => a.id === e.to)?.label ?? e.to
      );
    } else {
      tooltipTitle = 'Depends on:';
      tooltipItems = EDGES.filter((e) => e.to === selectedNode).map(
        (e) => PKG_POSITIONS.find((p) => p.id === e.from)?.label ?? e.from
      );
    }
  }

  // Phase bar geometry
  const totalWeeks = phases.reduce((sum, p) => sum + p.estimatedWeeks, 0) || 1;

  const phasePositions = phases.map((phase, i) => {
    const cumWeeks = phases.slice(0, i).reduce((s, p) => s + p.estimatedWeeks, 0);
    const x = PHASE_PADDING_X + (cumWeeks / totalWeeks) * PHASE_USABLE_W;
    const w = (phase.estimatedWeeks / totalWeeks) * PHASE_USABLE_W;
    return { ...phase, x, w };
  });

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
                : 'text-text-secondary border-transparent hover:text-text-primary'
            )}
          >
            {tab === 'packages' ? 'Package Dependencies' : 'Phase Dependencies'}
          </button>
        ))}
      </div>

      {/* Package Dependencies view */}
      {activeTab === 'packages' && (
        <div className="relative">
          <svg
            width={SVG_W}
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full"
            style={{ background: COLOR_BG }}
          >
            {/* Column headers */}
            <text x={PKG_X + PKG_W / 2} y={35} textAnchor="middle" fill={COLOR_TEXT_SECONDARY} fontSize={10} fontFamily={MONO_FONT}>
              PACKAGES
            </text>
            <text x={APP_X + APP_W / 2} y={35} textAnchor="middle" fill={COLOR_TEXT_SECONDARY} fontSize={10} fontFamily={MONO_FONT}>
              APPS
            </text>

            {/* Edges */}
            {EDGES.map((edge, i) => {
              const pkg = PKG_POSITIONS.find((p) => p.id === edge.from);
              const app = APP_POSITIONS.find((a) => a.id === edge.to);
              if (!pkg || !app) return null;
              const x1 = pkg.x + PKG_W;
              const y1 = pkg.y + NODE_H / 2;
              const x2 = app.x;
              const y2 = app.y + NODE_H / 2;
              return (
                <polyline
                  key={i}
                  points={`${x1},${y1} ${MID_X},${y1} ${MID_X},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke={COLOR_EDGE}
                  strokeWidth={1.5}
                  strokeOpacity={getEdgeOpacity(edge)}
                />
              );
            })}

            {/* Package nodes */}
            {PKG_POSITIONS.map((pkg) => {
              const isSelected = selectedNode === pkg.id;
              return (
                <g key={pkg.id} onClick={() => handleNodeClick(pkg.id)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={pkg.x}
                    y={pkg.y}
                    width={PKG_W}
                    height={NODE_H}
                    rx={4}
                    fill={COLOR_NODE_FILL}
                    stroke={isSelected ? COLOR_NODE_STROKE_SELECTED : COLOR_NODE_STROKE_DEFAULT}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                  <text
                    x={pkg.x + PKG_W / 2}
                    y={pkg.y + NODE_H / 2 + 4}
                    textAnchor="middle"
                    fill={isSelected ? COLOR_TEXT_PRIMARY : COLOR_TEXT_SECONDARY}
                    fontSize={11}
                    fontFamily={MONO_FONT}
                  >
                    {pkg.label}
                  </text>
                </g>
              );
            })}

            {/* App nodes */}
            {APP_POSITIONS.map((app) => {
              const isSelected = selectedNode === app.id;
              return (
                <g key={app.id} onClick={() => handleNodeClick(app.id)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={app.x}
                    y={app.y}
                    width={APP_W}
                    height={NODE_H}
                    rx={4}
                    fill={COLOR_NODE_FILL}
                    stroke={isSelected ? COLOR_NODE_STROKE_SELECTED : COLOR_NODE_STROKE_DEFAULT}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                  <text
                    x={app.x + APP_W / 2}
                    y={app.y + NODE_H / 2 + 4}
                    textAnchor="middle"
                    fill={isSelected ? COLOR_TEXT_PRIMARY : COLOR_TEXT_SECONDARY}
                    fontSize={11}
                    fontFamily={MONO_FONT}
                  >
                    {app.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {selectedNode !== null && tooltipItems.length > 0 && (
            <div className="mt-2 bg-surface-card border border-border-default rounded-md p-3 max-w-sm">
              <p className="text-xs text-text-secondary mb-1.5">{tooltipTitle}</p>
              <div className="flex flex-wrap gap-1">
                {tooltipItems.map((item) => (
                  <span
                    key={item}
                    className="text-xs font-mono text-text-primary bg-surface-hover px-2 py-0.5 rounded"
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
        <div>
          <svg
            width={PHASE_SVG_W}
            height={PHASE_SVG_H}
            viewBox={`0 0 ${PHASE_SVG_W} ${PHASE_SVG_H}`}
            className="w-full"
            style={{ background: COLOR_BG }}
          >
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill={COLOR_ARROW} />
              </marker>
            </defs>

            {/* Phase bars */}
            {phasePositions.map((phase) => {
              const fill = getPhaseFill(phase.status);
              const stroke = getPhaseStroke(phase.status);
              const fillOpacity = getPhaseFillOpacity(phase.status);
              const dotFill = getPhaseStroke(phase.status);
              const maxChars = Math.max(0, Math.floor((phase.w - 24) / 7));
              let nameLabel = '';
              if (maxChars > 4) {
                nameLabel =
                  phase.name.length > maxChars ? phase.name.slice(0, maxChars - 1) + '…' : phase.name;
              }

              return (
                <g key={phase.id}>
                  <rect
                    x={phase.x}
                    y={PHASE_BAR_Y}
                    width={phase.w}
                    height={PHASE_BAR_H}
                    rx={4}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeWidth={1}
                  />
                  {/* Status dot */}
                  <circle
                    cx={phase.x + 10}
                    cy={PHASE_BAR_Y + 12}
                    r={4}
                    fill={dotFill}
                  />
                  {/* Phase name */}
                  {nameLabel !== '' && (
                    <text
                      x={phase.x + 20}
                      y={PHASE_BAR_Y + 16}
                      fill={COLOR_TEXT_PRIMARY}
                      fontSize={10}
                      fontFamily={MONO_FONT}
                    >
                      {nameLabel}
                    </text>
                  )}
                  {/* Weeks label below bar */}
                  <text
                    x={phase.x + phase.w / 2}
                    y={PHASE_BAR_Y + PHASE_BAR_H + 14}
                    textAnchor="middle"
                    fill={COLOR_TEXT_SECONDARY}
                    fontSize={9}
                    fontFamily={MONO_FONT}
                  >
                    {phase.estimatedWeeks}w
                  </text>
                </g>
              );
            })}

            {/* Content track */}
            <rect
              x={PHASE_PADDING_X}
              y={CONTENT_BAR_Y}
              width={PHASE_USABLE_W}
              height={CONTENT_BAR_H}
              rx={4}
              fill={COLOR_CONTENT}
              fillOpacity={0.1}
              stroke={COLOR_CONTENT}
              strokeOpacity={0.4}
              strokeWidth={1}
            />
            <text
              x={PHASE_PADDING_X + 8}
              y={CONTENT_BAR_Y + 18}
              fill={COLOR_CONTENT}
              fillOpacity={0.8}
              fontSize={10}
              fontFamily={MONO_FONT}
            >
              Content
            </text>

            {/* Dependency arrows between consecutive phase bars */}
            {phasePositions.slice(0, -1).map((phase, i) => {
              const next = phasePositions[i + 1];
              if (!next) return null;
              const x1 = phase.x + phase.w;
              const x2 = next.x;
              const midY = PHASE_BAR_Y + PHASE_BAR_H / 2;
              if (x2 - x1 < 4) return null;
              return (
                <path
                  key={`dep-${i}`}
                  d={`M ${x1} ${midY} L ${x2} ${midY}`}
                  stroke={COLOR_ARROW}
                  strokeWidth={1.5}
                  fill="none"
                  markerEnd="url(#arrow)"
                />
              );
            })}
          </svg>
        </div>
      )}

      {activeTab === 'phases' && phases.length === 0 && (
        <p className="text-text-secondary text-sm py-8 text-center font-mono">
          No phase data available.
        </p>
      )}
    </div>
  );
}
