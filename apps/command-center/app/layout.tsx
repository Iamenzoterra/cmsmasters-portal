import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { GlobalSearch, type SearchEntry } from '@/components/GlobalSearch';
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
  const [project, components, contentData, adrs] = await Promise.all([
    getPhases(),
    getComponents(),
    getContentStatusEntries(),
    getADRList(),
  ]);

  const searchIndex: SearchEntry[] = [];

  // Pages
  const pages: SearchEntry[] = [
    { id: 'page-home',         type: 'page', name: 'Mission Control',  context: 'Home',         href: '/',              selectionKey: '1' },
    { id: 'page-phases',       type: 'page', name: 'Phase Tracker',    context: 'Phases',       href: '/phases',        selectionKey: '2' },
    { id: 'page-components',   type: 'page', name: 'Components',       context: 'Design System',href: '/components',    selectionKey: '3' },
    { id: 'page-content',      type: 'page', name: 'Content',          context: 'Content',      href: '/content',       selectionKey: '4' },
    { id: 'page-architecture', type: 'page', name: 'Architecture',     context: 'ADRs',         href: '/architecture',  selectionKey: '5' },
    { id: 'page-dependencies', type: 'page', name: 'Dependencies',     context: 'Packages',     href: '/dependencies',  selectionKey: '6' },
  ];
  searchIndex.push(...pages);

  // Phases & tasks
  if (project) {
    for (const phase of project.phases) {
      searchIndex.push({
        id:           `phase-${phase.id}`,
        type:         'phase',
        name:         phase.title,
        context:      phase.description,
        href:         `/phases/${phase.id}`,
        selectionKey: '',
      });
      for (const task of phase.tasks) {
        searchIndex.push({
          id:           `task-${task.id}`,
          type:         'task',
          name:         task.title,
          context:      phase.title,
          href:         `/phases/${phase.id}`,
          selectionKey: '',
        });
      }
    }
  }

  // Components — handle both array and { components: [...] } shapes
  let componentList: typeof components = null;
  if (Array.isArray(components)) {
    componentList = components;
  } else if (components !== null && typeof components === 'object' && 'components' in (components as object)) {
    const nested = (components as { components?: typeof components }).components;
    if (Array.isArray(nested)) componentList = nested;
  }
  if (componentList) {
    for (const comp of componentList) {
      searchIndex.push({
        id:           `comp-${comp.id}`,
        type:         'component',
        name:         comp.name,
        context:      comp.description ?? '',
        href:         '/components',
        selectionKey: '',
      });
    }
  }

  // Themes from content
  if (contentData) {
    for (const theme of contentData.recentThemes) {
      searchIndex.push({
        id:           `theme-${theme.id}`,
        type:         'theme',
        name:         theme.name,
        context:      'Content',
        href:         '/content',
        selectionKey: '',
      });
    }
  }

  // ADRs
  for (const adr of adrs) {
    searchIndex.push({
      id:           `adr-${adr.id}`,
      type:         'adr',
      name:         adr.title,
      context:      adr.category ?? adr.status,
      href:         `/architecture/${adr.id}`,
      selectionKey: '',
    });
  }

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
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto px-8 py-6">
            {children}
          </main>
        </div>
        <GlobalSearch searchIndex={searchIndex} />
        <Script id="keyboard-shortcuts" strategy="afterInteractive">{`
          (function () {
            var ROUTE_MAP = { '1': '/', '2': '/phases', '3': '/components', '4': '/content', '5': '/architecture', '6': '/dependencies' };
            document.addEventListener('keydown', function (e) {
              var target = e.target;
              if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
              if (e.metaKey || e.ctrlKey || e.altKey) return;
              var route = ROUTE_MAP[e.key];
              if (route) {
                e.preventDefault();
                window.location.assign(route);
              }
            });
          })();
        `}</Script>
      </body>
    </html>
  );
}
