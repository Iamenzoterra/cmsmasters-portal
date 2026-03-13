import type React from 'react';
import { getPhases } from '@/lib/data';
import { InfraChecklist, type InfraItem } from '@/components/InfraChecklist';

const INFRA_ITEMS: { label: string; keywords: string[] }[] = [
  { label: 'Monorepo Nx',        keywords: ['nx config', 'nx monorepo', 'monorepo init'] },
  { label: 'Vercel Portal',      keywords: ['vercel portal'] },
  { label: 'Vercel Static SPAs', keywords: ['vercel static'] },
  { label: 'CF Workers API',     keywords: ['cf workers', 'workers api'] },
  { label: 'Supabase Schema',    keywords: ['db schema', 'supabase schema'] },
  { label: 'Auth',               keywords: ['supabase auth'] },
  { label: 'Meilisearch',        keywords: ['meilisearch'] },
  { label: 'R2',                 keywords: ['r2 bucket', 'r2 storage', 'cloudflare r2'] },
  { label: 'Resend',             keywords: ['resend'] },
  { label: 'Storybook',          keywords: ['storybook'] },
  { label: 'CI/CD',              keywords: ['ci/cd'] },
  { label: 'Domain',             keywords: ['production domain', 'custom domain', 'domain setup'] },
];

export default async function MissionControl(): Promise<React.ReactElement> {
  const project = await getPhases();
  const allTasks = project?.phases.flatMap((p) => p.tasks) ?? [];

  const items: InfraItem[] = INFRA_ITEMS.map(({ label, keywords }) => {
    const match = allTasks.find((task) =>
      keywords.some((kw) => task.title.toLowerCase().includes(kw.toLowerCase())),
    );
    return {
      label,
      done: match?.status === 'done',
      taskTitle: match?.title,
    };
  });

  return (
    <div>
      <h1 className="text-text-primary">Mission Control</h1>
      <div className="mt-6">
        <InfraChecklist items={items} />
      </div>
    </div>
  );
}
