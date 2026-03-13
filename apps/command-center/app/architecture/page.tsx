import fs from 'node:fs/promises';
import path from 'node:path';

import type React from 'react';
import { getADRList, getADRContent } from '@/lib/data';
import type { ADRMetaWithBody } from '@/lib/types';
import { ArchitectureTabs } from './ArchitectureTabs';
import type { TechStackLayer } from './ArchitectureTabs';

const MONOREPO_ROOT = path.resolve(process.cwd(), '..', '..');
const GRAND_WORKPLAN_PATH = path.join(
  MONOREPO_ROOT,
  'workplan',
  'reference',
  'Grand_Workplan_CMSMasters_Portal.md',
);

const TECH_STACK_LAYERS: TechStackLayer[] = [
  {
    name: 'Frontend',
    items: [
      { name: 'Next.js 15 App Router', description: 'React server & client components' },
      { name: 'React 19', description: 'UI rendering' },
      { name: 'Tailwind CSS 4', description: 'Utility-first styling' },
      { name: 'Recharts', description: 'Data visualisation' },
      { name: 'Lucide React', description: 'Icon library' },
      { name: 'react-markdown + remark-gfm', description: 'Markdown rendering' },
    ],
  },
  {
    name: 'Data',
    items: [
      { name: 'JSON files in workplan/', description: 'Phases, components, content status' },
      { name: 'Markdown ADRs in workplan/adr/', description: 'Architecture decision records' },
      { name: 'Node.js fs module', description: 'Server-side file reads' },
      { name: 'Zero database', description: 'Localhost only — no external DB' },
    ],
  },
  {
    name: 'Services',
    items: [
      { name: 'cc:scan', description: 'CLI scanner' },
      { name: 'cc:report', description: 'CLI reporter' },
      { name: 'cc:dev', description: 'CLI dev server' },
    ],
  },
  {
    name: 'Infrastructure',
    items: [
      { name: 'Nx Monorepo', description: 'Build system & task orchestration' },
      { name: 'TypeScript strict mode', description: 'No any, explicit return types' },
      { name: 'Localhost port 4000', description: 'Internal tool only' },
      { name: 'No auth', description: 'Internal only — no authentication layer' },
    ],
  },
];

export default async function ArchitecturePage(): Promise<React.ReactElement> {
  const adrMetas = await getADRList();

  const adrResults = await Promise.all(
    adrMetas.map(async (meta): Promise<ADRMetaWithBody> => {
      const withBody = await getADRContent(meta.id);
      return withBody ?? { ...meta, body: '' };
    }),
  );

  let workplanMarkdown: string | null;
  try {
    workplanMarkdown = await fs.readFile(GRAND_WORKPLAN_PATH, 'utf8');
  } catch {
    workplanMarkdown = null;
  }

  return (
    <ArchitectureTabs
      adrs={adrResults}
      workplanMarkdown={workplanMarkdown}
      workplanPath={GRAND_WORKPLAN_PATH}
      techStackLayers={TECH_STACK_LAYERS}
    />
  );
}
