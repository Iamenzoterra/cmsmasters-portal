import type React from 'react';
import {
  getInfraItems,
  getAppCards,
  getDesignSystemLayers,
  getContentStatusEntries,
} from '@/lib/data';
import { AppCard } from '@/components/AppCard';
import { DesignSystemProgress } from '@/components/DesignSystemProgress';
import { ContentOverview } from '@/components/ContentOverview';
import { InfraChecklist } from '@/components/InfraChecklist';
import { Card } from '@/ui/Card';

export default async function MissionControl(): Promise<React.ReactElement> {
  const [apps, layers, contentData, infraItems] = await Promise.all([
    getAppCards(),
    getDesignSystemLayers(),
    getContentStatusEntries(),
    getInfraItems(),
  ]);

  const metrics = contentData?.metrics ?? {
    themesPublished: 0,
    themesTotal:     0,
    docsPublished:   0,
    docsTarget:      0,
    blogPosts:       0,
    blogTarget:      0,
  };
  const recentThemes = contentData?.recentThemes ?? [];

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Mission Control</h1>
      <div className="grid grid-cols-2 gap-6">

        {/* Top-left: Apps */}
        <Card className="h-full">
          <span className="text-xs uppercase tracking-widest text-text-secondary">Apps</span>
          <div className="flex flex-col gap-3 mt-3">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </Card>

        {/* Top-right: Design System */}
        <Card className="h-full">
          <span className="text-xs uppercase tracking-widest text-text-secondary">
            Design System
          </span>
          <div className="mt-3">
            <DesignSystemProgress layers={layers} />
          </div>
        </Card>

        {/* Bottom-left: Content */}
        <Card className="h-full">
          <ContentOverview metrics={metrics} recentThemes={recentThemes} />
        </Card>

        {/* Bottom-right: Infrastructure */}
        <InfraChecklist items={infraItems} />

      </div>
    </div>
  );
}
