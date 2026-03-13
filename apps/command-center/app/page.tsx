import type React from 'react';

import {
  getPhaseBlocks,
  getAppCards,
  getDesignSystemLayers,
  getContentStatusEntries,
  getInfraItems,
  getPhases,
} from '@/lib/data';
import { Card } from '@/ui/Card';
import { PhaseTimeline } from '@/components/PhaseTimeline';
import { AppCard } from '@/components/AppCard';
import { DesignSystemProgress } from '@/components/DesignSystemProgress';
import { ContentOverview } from '@/components/ContentOverview';
import { InfraChecklist } from '@/components/InfraChecklist';
import { ActivityFeed } from '@/components/ActivityFeed';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Page(): Promise<React.ReactElement> {
  const [phaseData, apps, dsLayers, contentData, infraItems, project] =
    await Promise.all([
      getPhaseBlocks(),
      getAppCards(),
      getDesignSystemLayers(),
      getContentStatusEntries(),
      getInfraItems(),
      getPhases(),
    ]);

  const allTasks = project?.phases.flatMap((p) =>
    p.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      app: t.app,
      owner: t.owner,
      completedAt: t.completedAt,
      updatedAt: t.completedAt ?? t.createdAt,
    })),
  ) ?? [];

  return (
    <main className="p-8 space-y-8">
      {/* Phase Timeline */}
      {phaseData ? (
        <PhaseTimeline
          phases={phaseData.phases}
          overallLabel={phaseData.overallLabel}
        />
      ) : (
        <div className="w-full bg-surface-card border border-zinc-800 rounded-card p-4 text-text-muted text-sm">
          No phase data — run cc:scan to populate
        </div>
      )}

      {/* 2×2 Dashboard Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Apps Panel */}
        <Card>
          <h2 className="text-text-primary font-semibold text-sm mb-4">Apps</h2>
          {apps.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {apps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">
              No apps — run cc:scan to populate
            </p>
          )}
        </Card>

        {/* Design System Panel */}
        <Card>
          <h2 className="text-text-primary font-semibold text-sm mb-4">
            Design System
          </h2>
          <DesignSystemProgress layers={dsLayers} />
        </Card>

        {/* Content Panel */}
        <Card>
          {contentData ? (
            <ContentOverview
              metrics={contentData.metrics}
              recentThemes={contentData.recentThemes}
            />
          ) : (
            <>
              <h2 className="text-text-primary font-semibold text-sm mb-4">
                Content
              </h2>
              <p className="text-text-muted text-sm">
                No content data — run cc:scan to populate
              </p>
            </>
          )}
        </Card>

        {/* Infrastructure Panel */}
        <InfraChecklist items={infraItems} />
      </div>

      {/* Activity Feed */}
      <Card>
        <h2 className="text-text-primary font-semibold text-sm mb-4">
          Recent Activity
        </h2>
        <ActivityFeed tasks={allTasks} />
      </Card>
    </main>
  );
}
