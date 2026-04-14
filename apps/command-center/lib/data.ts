import fs from 'node:fs/promises';
import path from 'node:path';

import type { PhaseBlock } from '../components/PhaseTimeline';
import type {
  Project,
  ComponentSummary,
  ContentStatus,
  ADRMeta,
  ADRMetaWithBody,
  InfraItem,
  AppCardApp,
  AppStatus,
  LayerName,
  LayerRow,
  ContentMetrics,
  ThemeItem,
  PackageNode,
  AppNode,
  DependencyEdge,
  DependencyGraphData,
} from './types';

// ─── Source path constants (relative to monorepo root) ───────────────────────

const MONOREPO_ROOT       = path.resolve(process.cwd(), '..', '..');
const PHASES_PATH         = path.join(MONOREPO_ROOT, 'workplan', 'phases.json');
const COMPONENTS_PATH     = path.join(MONOREPO_ROOT, 'workplan', 'components.json');
const CONTENT_STATUS_PATH = path.join(MONOREPO_ROOT, 'workplan', 'content-status.json');
const ADR_DIR             = path.join(MONOREPO_ROOT, 'workplan', 'adr');

// ─── Private helpers ─────────────────────────────────────────────────────────

function parseYamlListItems(lines: string[], startIndex: number): { items: string[]; nextIndex: number } {
  const items: string[] = [];
  let i = startIndex;
  while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
    items.push(lines[i].replace(/^\s+-\s+/, '').trim());
    i++;
  }
  return { items, nextIndex: i };
}

const LIST_KEYS = new Set(['relatedADRs', 'deciders', 'tags']);
const SCALAR_PARSERS: Record<string, (value: string, meta: Partial<ADRMeta>) => void> = {
  id:       (v, m) => { m.id = v; },
  title:    (v, m) => { m.title = v; },
  status:   (v, m) => { m.status = v as ADRMeta['status']; },
  date:     (v, m) => { m.date = v; },
  version:  (v, m) => { m.version = Number(v); },
  category: (v, m) => { m.category = v; },
};

function applyFrontmatterEntry(
  key: string,
  value: string,
  lines: string[],
  index: number,
  meta: Partial<ADRMeta>,
): number {
  if (value === '' && LIST_KEYS.has(key)) {
    const { items, nextIndex } = parseYamlListItems(lines, index + 1);
    const listMeta = meta as Record<string, unknown>;
    listMeta[key] = items;
    return nextIndex;
  }

  const parser = SCALAR_PARSERS[key];
  if (parser) parser(value, meta);

  return index + 1;
}

function parseFrontmatter(content: string): { meta: Partial<ADRMeta>; body: string } {
  const parts = content.split(/^---\s*$/m);

  if (parts.length < 3) {
    return { meta: {}, body: content.trim() };
  }

  const yamlBlock = parts[1];
  const body = parts.slice(2).join('---').trim();
  const meta: Partial<ADRMeta> = {};
  const lines = yamlBlock.split('\n');
  let i = 0;

  while (i < lines.length) {
    const match = lines[i].match(/^(\w[\w-]*):\s*(.*)/);
    if (match) {
      const key = match[1] as string;
      const value = match[2].trim().replace(/^['"](.+)['"]$/, '$1');
      i = applyFrontmatterEntry(key, value, lines, i, meta);
    } else {
      i++;
    }
  }

  return { meta, body };
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Exported data readers ───────────────────────────────────────────────────

/** Reads workplan/phases.json and returns the typed Project structure. */
export async function getPhases(): Promise<Project | null> {
  const raw = await readJson<Record<string, unknown>>(PHASES_PATH);
  if (!raw) return null;

  // Normalise: phases.json tasks may omit fields that the Task type requires.
  const phases = ((raw.phases as Record<string, unknown>[]) ?? []).map((p) => {
    const tasks = ((p.tasks as Record<string, unknown>[]) ?? []).map((t) => ({
      id:                 (t.id as string) ?? '',
      title:              (t.title as string) ?? '',
      description:        (t.description as string) ?? '',
      owner:              (t.owner as string) ?? 'orchestrator',
      app:                (t.app as string) ?? 'infra',
      status:             (t.status as string) ?? 'todo',
      priority:           (t.priority as string) ?? 'medium',
      dependencies:       (t.dependencies as string[]) ?? [],
      estimatedHours:     (t.estimatedHours as number) ?? 0,
      actualHours:        (t.actualHours as number) ?? undefined,
      acceptanceCriteria: (t.acceptanceCriteria as string[]) ?? [],
      notes:              (t.notes as string) ?? undefined,
      createdAt:          (t.createdAt as string) ?? (raw.started as string) ?? '2025-01-01',
      completedAt:        (t.completedAt as string) ?? undefined,
    }));
    return {
      id:          String(p.id ?? ''),
      title:       (p.title as string) ?? '',
      description: (p.description as string) ?? '',
      status:      (p.status as string) ?? 'todo',
      tasks,
    };
  });

  return {
    id:          (raw.name as string) ?? 'project',
    title:       (raw.name as string) ?? 'Phase Tracker',
    description: (raw.description as string) ?? `${phases.length} phases`,
    phases,
  } as Project;
}

/** Reads workplan/components.json. Unwraps `{ components }` wrapper if present. */
export async function getComponents(): Promise<ComponentSummary[] | null> {
  const raw = await readJson<{ components: ComponentSummary[] } | ComponentSummary[]>(COMPONENTS_PATH);
  if (Array.isArray(raw)) return raw;
  if (raw && 'components' in raw && Array.isArray(raw.components)) return raw.components;
  return null;
}

// ─── Infra item mapping ───────────────────────────────────────────────────────

const INFRA_ITEM_DEFS: { label: string; keywords: string[] }[] = [
  { label: 'Monorepo Nx',        keywords: ['Nx monorepo init'] },
  { label: 'Vercel Portal',      keywords: ['Vercel Portal deployment'] },
  { label: 'Vercel Static SPAs', keywords: ['Vercel Static SPAs'] },
  { label: 'CF Workers API',     keywords: ['CF Workers API deployment'] },
  { label: 'Supabase Schema',    keywords: ['DB schema — 6 domains'] },
  { label: 'Auth',               keywords: ['Auth — Supabase Auth'] },
  { label: 'Meilisearch',        keywords: ['Meilisearch'] },
  { label: 'R2',                 keywords: ['R2'] },
  { label: 'Resend',             keywords: ['Resend'] },
  { label: 'Storybook',          keywords: ['Infra — Storybook'] },
  { label: 'CI/CD',              keywords: ['CI/CD pipeline'] },
  { label: 'Domain',             keywords: ['DNS cutover'] },
];

/**
 * Derives infrastructure readiness by matching static item keywords against
 * task titles in phases.json. An item is done when its matched task has
 * status === 'done'.
 */
export async function getInfraItems(): Promise<InfraItem[]> {
  const project = await getPhases();
  const allTasks = project?.phases.flatMap((p) => p.tasks) ?? [];

  return INFRA_ITEM_DEFS.map(({ label, keywords }) => {
    const match = allTasks.find((task) =>
      keywords.some((kw) => task.title.toLowerCase().includes(kw.toLowerCase())),
    );
    return {
      label,
      done: match?.status === 'done',
      taskTitle: match?.title,
    };
  });
}

// ─── App cards ────────────────────────────────────────────────────────────────

const PORTAL_APP_DEFS: { id: string; name: string; description: string }[] = [
  { id: 'portal',    name: 'Portal',    description: 'Next.js SSG'      },
  { id: 'dashboard', name: 'Dashboard', description: 'Vite SPA'         },
  { id: 'support',   name: 'Support',   description: 'Vite SPA'         },
  { id: 'studio',    name: 'Studio',    description: 'Vite SPA'         },
  { id: 'admin',     name: 'Admin',     description: 'Vite SPA'         },
  { id: 'api',       name: 'API',       description: 'Hono CF Workers'  },
];

/**
 * Derives AppCardApp[] for the five portal apps from phases.json task data.
 * Status is 'not-started' (0 done), 'in-progress' (some done), 'live' (all done).
 */
export async function getAppCards(): Promise<AppCardApp[]> {
  const project = await getPhases();
  const allTasks = project?.phases.flatMap((p) => p.tasks) ?? [];

  return PORTAL_APP_DEFS.map(({ id, name, description }) => {
    const appTasks = allTasks.filter((t) => t.app === id);
    const doneTasks = appTasks.filter((t) => t.status === 'done');

    let status: AppStatus;
    if (appTasks.length === 0 || doneTasks.length === 0) {
      status = 'not-started';
    } else if (doneTasks.length === appTasks.length) {
      status = 'live';
    } else {
      status = 'in-progress';
    }

    return { id, name, description, status, href: `/phases?app=${id}` };
  });
}

// ─── Design system layers ─────────────────────────────────────────────────────

const INFRA_APPS = new Set(['infra', 'command-center', 'db', 'auth', 'email', 'validators', 'api-client']);
const PRIMITIVE_KEYWORDS = ['primitive', 'token', 'atom', 'color', 'font', 'spacing', 'icon'];
const DOMAIN_KEYWORDS = [
  'domain', 'button', 'badge', 'input', 'card', 'modal', 'select', 'checkbox', 'progress',
];

/**
 * Buckets components from components.json into four layers (infrastructure +
 * three design-system layers) and returns LayerRow[] with completion counts.
 * Returns null when the file is missing.
 */
export async function getDesignSystemLayers(): Promise<LayerRow[] | null> {
  const data = await readJson<{ components: ComponentSummary[] }>(COMPONENTS_PATH);
  const components = data?.components;
  if (!components) return null;

  const buckets: Record<LayerName, ComponentSummary[]> = {
    Primitives:     [],
    Domain:         [],
    Layouts:        [],
    Infrastructure: [],
  };

  const LAYER_TO_DISPLAY: Record<string, LayerName> = {
    primitives: 'Primitives', domain: 'Domain',
    layouts: 'Layouts', infrastructure: 'Infrastructure',
  };

  for (const comp of components) {
    // Filesystem entries: use real layer from scanner
    if (comp.source === 'filesystem' && comp.layer) {
      const mapped = LAYER_TO_DISPLAY[comp.layer];
      if (mapped) { buckets[mapped].push(comp); continue; }
    }
    // Legacy fallback: keyword heuristic
    if (INFRA_APPS.has(comp.app)) {
      buckets.Infrastructure.push(comp);
      continue;
    }
    const lower = comp.name.toLowerCase();
    if (PRIMITIVE_KEYWORDS.some((kw) => lower.includes(kw))) {
      buckets.Primitives.push(comp);
    } else if (DOMAIN_KEYWORDS.some((kw) => lower.includes(kw))) {
      buckets.Domain.push(comp);
    } else {
      buckets.Layouts.push(comp);
    }
  }

  // Only return design-system layers — infrastructure is excluded
  const layers: LayerName[] = ['Primitives', 'Domain', 'Layouts'];
  return layers.map((layer) => {
    const comps = buckets[layer];
    const completed = comps.filter((c) => c.status === 'done').length;
    return { layer, completed, total: comps.length, href: '/components' };
  });
}

// ─── Content status entries ───────────────────────────────────────────────────

/**
 * Reads content-status.json and derives ContentMetrics plus up to 10 distinct
 * ThemeItem values. Returns null when the file is missing.
 */
export async function getContentStatusEntries(): Promise<{
  metrics: ContentMetrics;
  recentThemes: ThemeItem[];
} | null> {
  const data = await readJson<{ entries: ContentStatus[] }>(CONTENT_STATUS_PATH);
  if (!data?.entries) return null;

  const entries = data.entries;
  const docs  = entries.filter((e) => e.type === 'doc');
  const blogs = entries.filter((e) => e.type === 'blog');

  const seenIds = new Set<string>();
  const recentThemes: ThemeItem[] = [];
  for (const entry of entries) {
    if (!seenIds.has(entry.themeId) && recentThemes.length < 10) {
      seenIds.add(entry.themeId);
      recentThemes.push({
        id:          entry.themeId,
        name:        entry.themeId,
        lastUpdated: entry.updatedAt.slice(0, 10),
      });
    }
  }

  const metrics: ContentMetrics = {
    themesPublished: entries.filter((e) => e.status === 'published').length,
    themesTotal:     seenIds.size,
    docsPublished:   docs.filter((e)  => e.status === 'published').length,
    docsTarget:      docs.length,
    blogPosts:       blogs.filter((e) => e.status === 'published').length,
    blogTarget:      blogs.length,
  };

  return { metrics, recentThemes };
}

/**
 * Lists all ADR markdown files in workplan/adr/ and parses their YAML
 * frontmatter into ADRMeta objects. Returns an empty array when the directory
 * does not exist.
 */
export async function getADRList(): Promise<ADRMeta[]> {
  let files: string[];

  try {
    files = await fs.readdir(ADR_DIR);
  } catch {
    return [];
  }

  const mdFiles = files.filter((f) => f.endsWith('.md'));

  const results = await Promise.all(
    mdFiles.map(async (filename): Promise<ADRMeta | null> => {
      try {
        const content = await fs.readFile(path.join(ADR_DIR, filename), 'utf8');
        const { meta } = parseFrontmatter(content);

        if (!meta.id || !meta.title || !meta.status || !meta.date) return null;

        return meta as ADRMeta;
      } catch {
        return null;
      }
    }),
  );

  return results.filter((r): r is ADRMeta => r !== null);
}

/**
 * Reads a single ADR file from workplan/adr/ matching the given id or filename
 * slug. Returns the parsed frontmatter plus the markdown body, or null when no
 * match is found.
 */
export async function getADRContent(idOrSlug: string | number): Promise<ADRMetaWithBody | null> {
  let files: string[];

  try {
    files = await fs.readdir(ADR_DIR);
  } catch {
    return null;
  }

  const mdFiles = files.filter((f) => f.endsWith('.md'));

  for (const filename of mdFiles) {
    try {
      const content = await fs.readFile(path.join(ADR_DIR, filename), 'utf8');
      const { meta, body } = parseFrontmatter(content);

      const slug = filename.replace(/\.md$/, '');
      const idMatch =
        meta.id === String(idOrSlug) ||
        meta.id === idOrSlug ||
        slug === String(idOrSlug);

      if (idMatch && meta.id && meta.title && meta.status && meta.date) {
        return { ...(meta as ADRMeta), body };
      }
    } catch {
      continue;
    }
  }

  return null;
}

// ─── Phase blocks for PhaseTimeline ──────────────────────────────────────────

/**
 * Derives PhaseBlock[] for the PhaseTimeline component from phases.json.
 * Returns { phases, overallLabel } or null when phases.json is missing.
 */
export async function getPhaseBlocks(): Promise<{
  phases: PhaseBlock[];
  overallLabel: string;
} | null> {
  const project = await getPhases();
  if (!project) return null;

  const allTasks = project.phases.flatMap((p) => p.tasks);
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter((t) => t.status === 'done').length;
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const phases: PhaseBlock[] = project.phases.map((phase) => {
    const phaseTasks = phase.tasks;
    const phaseTotal = phaseTasks.length;
    const phaseDone = phaseTasks.filter((t) => t.status === 'done').length;
    const progressPct = phaseTotal > 0 ? Math.round((phaseDone / phaseTotal) * 100) : 0;

    // Derive status from tasks if phase.status is missing
    let status: PhaseBlock['status'] = 'todo';
    if (phase.status === 'done' || (phaseTotal > 0 && phaseDone === phaseTotal)) {
      status = 'done';
    } else if (phase.status === 'in-progress' || phaseDone > 0) {
      status = 'in-progress';
    }

    let totalHours = 0;
    for (const t of phase.tasks) {
      totalHours += t.estimatedHours ?? 0;
    }
    const estimatedWeeks = totalHours > 0 ? Math.ceil(totalHours / 40) : 1;

    return {
      id: phase.id,
      name: phase.title,
      subtitle: `${phaseDone}/${phaseTotal} tasks`,
      status,
      progressPct,
      estimatedWeeks,
      isCurrent: status === 'in-progress',
      href: `/phases/${phase.id}`,
    };
  });

  return { phases, overallLabel: `${overallPct}%` };
}

// ─── Dependency graph (server-side) ──────────────────────────────────────────

const SPEC_APPS = ['command-center', 'portal', 'dashboard', 'support', 'studio', 'admin', 'api'];
const SPEC_PACKAGES = ['ui', 'db', 'auth', 'api-client', 'validators', 'email'];

interface PkgJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Reads every package.json under apps/ and packages/, extracts @cmsmasters/*
 * dependency references, and builds the package-dependency graph.  Planned apps
 * that lack a package.json are derived from phases.json task.app values.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function loadDependencyGraph(): Promise<DependencyGraphData> {
  const totalExpected = SPEC_APPS.length + SPEC_PACKAGES.length;

  // ── 1. Read package.json files ──────────────────────────────────────────────
  const readPkgJson = async (dir: 'apps' | 'packages', name: string): Promise<{ name: string; data: PkgJson | null }> => {
    const filePath = path.join(MONOREPO_ROOT, dir, name, 'package.json');
    const data = await readJson<PkgJson>(filePath);
    return { name, data };
  };

  const [appResults, pkgResults, project] = await Promise.all([
    Promise.all(SPEC_APPS.map((n) => readPkgJson('apps', n))),
    Promise.all(SPEC_PACKAGES.map((n) => readPkgJson('packages', n))),
    getPhases(),
  ]);

  const foundCount =
    appResults.filter((r) => r.data !== null).length +
    pkgResults.filter((r) => r.data !== null).length;

  // ── 2. Build package nodes from discovered package.json files ───────────────
  const packages: PackageNode[] = SPEC_PACKAGES.map((id) => {
    const result = pkgResults.find((r) => r.name === id);
    const label = result?.data?.name ?? `@cmsmasters/${id}`;
    return { id, label, affectedApps: [] };
  });

  // ── 3. Build app nodes: discovered + planned from phases.json ───────────────
  const plannedApps = new Set<string>(SPEC_APPS);
  const pkgIdSet = new Set(SPEC_PACKAGES);
  if (project) {
    for (const phase of project.phases) {
      for (const task of phase.tasks) {
        const app = task.app as string;
        if (app && !['infra', 'content'].includes(app) && !pkgIdSet.has(app)) {
          plannedApps.add(app);
        }
      }
    }
  }

  const apps: AppNode[] = [...plannedApps].map((id) => {
    const result = appResults.find((r) => r.name === id);
    const label = result?.data?.name ?? id;
    return { id, label };
  });

  // ── 4. Build edges from actual @cmsmasters/* dependencies ───────────────────
  const edges: DependencyEdge[] = [];
  const pkgIds = new Set(packages.map((p) => p.id));

  for (const appResult of appResults) {
    if (!appResult.data) continue;
    const allDeps = {
      ...appResult.data.dependencies,
      ...appResult.data.devDependencies,
    };
    for (const depName of Object.keys(allDeps)) {
      if (!depName.startsWith('@cmsmasters/')) continue;
      const pkgId = depName.replace('@cmsmasters/', '');
      if (pkgIds.has(pkgId)) {
        edges.push({ from: pkgId, to: appResult.name });
      }
    }
  }

  // ── 5. When no real edges exist, derive planned edges from phases.json ──────
  // phases.json tells us which apps are planned; ADR-017 defines that all
  // frontend apps share ui/auth/validators/api-client, and api uses
  // db/auth/validators/email.  We derive this from discovered packages +
  // the app categories present in phases.json.
  if (edges.length === 0) {
    const frontendApps = apps.filter((a) => a.id !== 'api').map((a) => a.id);
    const backendApps = apps.filter((a) => a.id === 'api').map((a) => a.id);

    const frontendPkgs = ['ui', 'auth', 'validators', 'api-client'].filter((id) => pkgIds.has(id));
    const backendPkgs = ['db', 'auth', 'validators', 'email'].filter((id) => pkgIds.has(id));

    for (const pkgId of frontendPkgs) {
      for (const appId of frontendApps) {
        edges.push({ from: pkgId, to: appId });
      }
    }
    for (const pkgId of backendPkgs) {
      for (const appId of backendApps) {
        edges.push({ from: pkgId, to: appId });
      }
    }
  }

  // ── 6. Populate affectedApps on each package node ───────────────────────────
  for (const pkg of packages) {
    pkg.affectedApps = edges.filter((e) => e.from === pkg.id).map((e) => e.to);
  }

  const isFallback = foundCount < totalExpected;

  return { packages, apps, edges, foundCount, totalExpected, isFallback };
}
