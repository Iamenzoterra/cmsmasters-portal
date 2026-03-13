import fs from 'node:fs/promises';
import path from 'node:path';

import type { App, Phase } from './types';

// ─── Scanner-specific types ───────────────────────────────────────────────────

export type ComponentLayer = 'primitives' | 'domain' | 'layouts';

export interface ComponentEntry {
  name: string;
  layer: ComponentLayer;
  hasStory: boolean;
  hasTest: boolean;
}

export interface ComponentScanSummary {
  entries: ComponentEntry[];
  counts: { primitives: number; domain: number; layouts: number };
  total: number;
}

export interface ContentScanResult {
  source: 'supabase' | 'placeholder';
  themes: unknown[];
  docs: unknown[];
  counts: { themes: number; docs: number };
}

export type ScannerApp = App | 'api';

export interface ProgressScanResult {
  phases: Array<{ phaseId: string; total: number; done: number }>;
  byApp: Record<ScannerApp, { total: number; done: number }>;
  overallPercent: number;
}

// ─── Path constants ───────────────────────────────────────────────────────────

const MONOREPO_ROOT = path.resolve(process.cwd(), '..', '..');
const UI_SRC        = path.join(MONOREPO_ROOT, 'packages', 'ui', 'src');
const PHASES_PATH   = path.join(MONOREPO_ROOT, 'workplan', 'phases.json');

// ─── Private helpers ──────────────────────────────────────────────────────────

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function scanLayer(layer: ComponentLayer): Promise<ComponentEntry[]> {
  const layerDir = path.join(UI_SRC, layer);
  let files: string[];

  try {
    files = await fs.readdir(layerDir);
  } catch {
    return [];
  }

  const componentFiles = files.filter(
    (f) => f.endsWith('.tsx') && !f.endsWith('.stories.tsx') && !f.endsWith('.test.tsx'),
  );

  return Promise.all(
    componentFiles.map(async (file): Promise<ComponentEntry> => {
      const base = file.replace(/\.tsx$/, '');
      const [hasStory, hasTest] = await Promise.all([
        fileExists(path.join(layerDir, `${base}.stories.tsx`)),
        fileExists(path.join(layerDir, `${base}.test.tsx`)).then((t) =>
          t || fileExists(path.join(layerDir, `${base}.spec.tsx`)),
        ),
      ]);

      return { name: base, layer, hasStory, hasTest };
    }),
  );
}

async function querySupabaseContent(url: string, key: string): Promise<ContentScanResult> {
  const headers = {
    Authorization: `Bearer ${key}`,
    apikey: key,
    'Content-Type': 'application/json',
  };

  try {
    const [themesRes, docsRes] = await Promise.all([
      fetch(`${url}/rest/v1/themes?select=*`, { headers }),
      fetch(`${url}/rest/v1/docs?select=*`, { headers }),
    ]);

    const [themes, docs] = await Promise.all([
      themesRes.ok ? (themesRes.json() as Promise<unknown[]>) : Promise.resolve([]),
      docsRes.ok ? (docsRes.json() as Promise<unknown[]>) : Promise.resolve([]),
    ]);

    return {
      source: 'supabase',
      themes,
      docs,
      counts: { themes: themes.length, docs: docs.length },
    };
  } catch {
    return { source: 'supabase', themes: [], docs: [], counts: { themes: 0, docs: 0 } };
  }
}

// ─── Exported scanner functions ───────────────────────────────────────────────

export async function scanComponents(): Promise<ComponentScanSummary> {
  const layers: ComponentLayer[] = ['primitives', 'domain', 'layouts'];
  const results = await Promise.all(layers.map((layer) => scanLayer(layer)));
  const [primitives, domain, layouts] = results;

  const entries = [...primitives, ...domain, ...layouts];

  return {
    entries,
    counts: {
      primitives: primitives.length,
      domain: domain.length,
      layouts: layouts.length,
    },
    total: entries.length,
  };
}

export async function scanContent(useSupabase?: boolean): Promise<ContentScanResult> {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (url && key && useSupabase !== false) {
    return querySupabaseContent(url, key);
  }

  return { source: 'placeholder', themes: [], docs: [], counts: { themes: 0, docs: 0 } };
}

export async function calculateProgress(): Promise<ProgressScanResult> {
  const allApps: ScannerApp[] = [
    'portal', 'dashboard', 'support', 'studio', 'admin',
    'command-center', 'ui', 'infra', 'content', 'api',
  ];

  const emptyByApp = (): Record<ScannerApp, { total: number; done: number }> =>
    Object.fromEntries(allApps.map((a) => [a, { total: 0, done: 0 }])) as Record<
      ScannerApp,
      { total: number; done: number }
    >;

  const empty: ProgressScanResult = {
    phases: [],
    byApp: emptyByApp(),
    overallPercent: 0,
  };

  let raw: string;
  try {
    raw = await fs.readFile(PHASES_PATH, 'utf8');
  } catch {
    return empty;
  }

  let project: { phases?: Phase[] };
  try {
    project = JSON.parse(raw) as { phases?: Phase[] };
  } catch {
    return empty;
  }

  const phases = project.phases ?? [];
  const byApp = emptyByApp();
  const phaseSummaries: ProgressScanResult['phases'] = [];

  let totalAll = 0;
  let doneAll = 0;

  for (const phase of phases) {
    const tasks = phase.tasks ?? [];
    let phaseTotal = 0;
    let phaseDone = 0;

    for (const task of tasks) {
      phaseTotal++;
      totalAll++;

      const isDone = task.status === 'done';
      if (isDone) {
        phaseDone++;
        doneAll++;
      }

      const appKey = task.app as ScannerApp;
      if (byApp[appKey]) {
        byApp[appKey].total++;
        if (isDone) byApp[appKey].done++;
      }
    }

    phaseSummaries.push({ phaseId: phase.id, total: phaseTotal, done: phaseDone });
  }

  const overallPercent = totalAll === 0 ? 0 : Math.round((doneAll / totalAll) * 100);

  return { phases: phaseSummaries, byApp, overallPercent };
}
