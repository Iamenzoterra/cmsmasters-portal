import type React from 'react';
import { getInfraItems } from '@/lib/data';
import { InfraChecklist } from '@/components/InfraChecklist';

export default async function MissionControl(): Promise<React.ReactElement> {
  const infraItems = await getInfraItems();

  return (
    <div>
      <h1 className="text-text-primary">Mission Control</h1>
      <div className="mt-6">
        <InfraChecklist items={infraItems} />
      </div>
    </div>
  );
}
