import Link from 'next/link';
import type React from 'react';

import { getComponents, getContentStatus, getPhases, getProgress } from '@/lib/data';
import type { Project } from '@/lib/types';
import { cn } from '@/theme/utils';
import { Card } from '@/ui/Card';
import { StatusBadge } from '@/ui/StatusBadge';
import type { Status } from '@/ui/StatusBadge';
import { getRelativeTime } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusDotBg(status: string): string {
  switch (status) {
    case 'done':        return 'bg-green-500';
    case 'in-progress': return 'bg-blue-500';
    case 'review':      return 'bg-yellow-500';
    case 'blocked':     return 'bg-red-500';
    default:            return 'bg-zinc-500';
  }
}

// ─── PhaseTimeline ────────────────────────────────────────────────────────────

function PhaseTimeline({ project }: { project: Project | null }): React.ReactElement {
  if (!project) {
    return (
      <div className="w-full bg-surface-card border border-zinc-800 rounded-card p-4 text-text-muted text-sm">
        No phase data — run cc:scan to populate
      </div>
    );
  }

  return (
    <div className="w-full bg-surface-card border border-zinc-800 rounded-card p-6 overflow-x-auto">
      <div className="flex items-start min-w-max">
        {project.phases.map((phase, index) => (
          <div key={phase.id} className="flex items-start">
            {index > 0 && (
              <div className="h-px w-10 bg-zinc-700 flex-shrink-0 mt-1.5" />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-3 h-3 rounded-full flex-shrink-0',
                  getStatusDotBg(phase.status),
                )}
              />
              <span className="font-mono text-[10px] text-text-muted">{phase.id}</span>
              <span className="text-xs text-text-primary max-w-[80px] text-center leading-tight">
                {phase.title}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DashboardPanel ───────────────────────────────────────────────────────────

interface PanelItem {
  id: string;
  name: string;
  status: string;
  href: string;
}

function DashboardPanel({
  title,
  items,
  viewAllHref,
  emptyMessage,
}: {
  title: string;
  items: PanelItem[] | null;
  viewAllHref: string;
  emptyMessage?: string;
}): React.ReactElement {
  const displayItems = items?.slice(0, 5) ?? [];
  const isEmpty = displayItems.length === 0;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-text-primary font-semibold text-sm">{title}</h2>
        <Link
          href={viewAllHref}
          className="text-text-muted text-xs hover:text-text-secondary transition-colors"
        >
          View all
        </Link>
      </div>
      {isEmpty ? (
        <p className="text-text-muted text-sm">
          {emptyMessage ?? 'No data — run cc:scan to populate'}
        </p>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between py-1.5 hover:bg-surface-hover rounded transition-colors px-1 -mx-1"
            >
              <span className="text-text-primary text-sm truncate mr-2">{item.name}</span>
              <StatusBadge status={item.status as Status} />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

function ActivityFeed({ project }: { project: Project | null }): React.ReactElement {
  if (!project) {
    return (
      <Card>
        <h2 className="text-text-primary font-semibold text-sm mb-4">Recent Activity</h2>
        <p className="text-text-muted text-sm">No activity — run cc:scan to populate</p>
      </Card>
    );
  }

  const allTasks = project.phases.flatMap((p) => p.tasks);
  const sorted = [...allTasks].sort((a, b) => {
    const aTime = new Date(a.completedAt ?? a.createdAt).getTime();
    const bTime = new Date(b.completedAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });
  const recent = sorted.slice(0, 10);

  return (
    <Card>
      <h2 className="text-text-primary font-semibold text-sm mb-4">Recent Activity</h2>
      {recent.length === 0 ? (
        <p className="text-text-muted text-sm">No tasks found</p>
      ) : (
        <div className="space-y-3">
          {recent.map((task) => (
            <div key={task.id} className="flex items-center gap-3">
              <span
                className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  getStatusDotBg(task.status),
                )}
              />
              <span className="text-text-primary text-sm flex-1 truncate">{task.title}</span>
              <span className="font-mono text-xs text-text-muted flex-shrink-0">{task.app}</span>
              <span className="font-mono text-xs text-text-muted flex-shrink-0 min-w-[56px] text-right">
                {getRelativeTime(task.completedAt ?? task.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Page(): Promise<React.ReactElement> {
  const [project, componentsRaw, contentStatus] = await Promise.all([
    getPhases(),
    getComponents(),
    getContentStatus(),
    getProgress(),
  ]);

  // components.json wraps the array under a `components` key at runtime
  const components = Array.isArray(componentsRaw)
    ? componentsRaw
    : (componentsRaw as unknown as { components?: typeof componentsRaw })?.components ?? null;

  const appApps = ['portal', 'dashboard', 'support', 'studio', 'admin'];

  const appsItems: PanelItem[] | null = components
    ? components
        .filter((c) => appApps.includes(c.app))
        .map((c) => ({ id: c.id, name: c.name, status: c.status, href: '/phases' }))
    : null;

  const dsItems: PanelItem[] | null = components
    ? components
        .filter((c) => c.app === 'ui')
        .map((c) => ({ id: c.id, name: c.name, status: c.status, href: '/components' }))
    : null;

  const contentItems: PanelItem[] | null = contentStatus
    ? [{ id: contentStatus.pageId, name: contentStatus.pageId, status: contentStatus.status, href: '/content' }]
    : null;

  const infraItems: PanelItem[] | null = components
    ? components
        .filter((c) => c.app === 'infra')
        .map((c) => ({ id: c.id, name: c.name, status: c.status, href: '/components' }))
    : null;

  return (
    <main className="p-8 space-y-8">
      <PhaseTimeline project={project} />
      <div className="grid grid-cols-2 gap-6">
        <DashboardPanel title="Apps" items={appsItems} viewAllHref="/phases" />
        <DashboardPanel title="Design System" items={dsItems} viewAllHref="/components" />
        <DashboardPanel title="Content" items={contentItems} viewAllHref="/content" />
        <DashboardPanel title="Infrastructure" items={infraItems} viewAllHref="/components" />
      </div>
      <ActivityFeed project={project} />
    </main>
  );
}
