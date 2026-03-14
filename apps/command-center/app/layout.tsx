import type React from 'react';
import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { GlobalSearch } from '@/components/GlobalSearch';
import type { SearchItem } from '@/components/GlobalSearch';
import { getPhases, getComponents, getContentStatusEntries, getADRList } from '@/lib/data';

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CMSMasters Command Center',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const [project, rawComponents, contentData, adrs] = await Promise.all([
    getPhases(),
    getComponents(),
    getContentStatusEntries(),
    getADRList(),
  ]);

  const taskItems: SearchItem[] = project?.phases.flatMap((phase) =>
    phase.tasks.map((task) => ({
      id: task.id,
      type: 'task' as const,
      name: task.title,
      context: `Phase ${phase.id} \u2022 ${task.status}`,
      href: `/phases/${phase.id}`,
    })),
  ) ?? [];

  const components = Array.isArray(rawComponents) ? rawComponents : [];
  const componentItems: SearchItem[] = components.map((comp) => ({
    id: comp.id,
    type: 'component' as const,
    name: comp.name,
    context: comp.description,
    href: '/components',
  }));

  const themeItems: SearchItem[] = (contentData?.recentThemes ?? []).map((theme) => ({
    id: theme.id,
    type: 'theme' as const,
    name: theme.name,
    context: `Last updated: ${theme.lastUpdated}`,
    href: '/content',
  }));

  const adrItems: SearchItem[] = adrs.map((adr) => ({
    id: adr.id,
    type: 'adr' as const,
    name: adr.title,
    context: `${adr.status} \u2022 ${adr.date}`,
    href: '/architecture',
  }));

  const searchIndex: SearchItem[] = [...taskItems, ...componentItems, ...themeItems, ...adrItems];

  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=LINE+Seed+JP:wght@100;400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${jetbrainsMono.variable} bg-surface-app text-text-primary`}
      >
        <GlobalSearch searchIndex={searchIndex} />
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto px-8 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
