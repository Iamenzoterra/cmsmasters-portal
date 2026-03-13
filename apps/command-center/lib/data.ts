import fs from 'node:fs/promises';
import path from 'node:path';

import type { PhaseBlock } from '../components/PhaseTimeline';
import type {
  Project,
  ComponentSummary,
  ContentStatus,
  ProgressData,
  ADRMeta,
  ADRMetaWithBody,
  InfraItem,
  AppCardApp,
  AppStatus,
  LayerName,
  LayerRow,
  ContentMetrics,
  ThemeItem,
} from './types';

// ─── Source path constants (relative to monorepo root) ───────────────────────

const MONOREPO_ROOT       = path.resolve(process.cwd(), '..', '..');
const PHASES_PATH         = path.join(MONOREPO_ROOT, 'workplan', 'phases.json');
const COMPONENTS_PATH     = path.join(MONOREPO_ROOT, 'workplan', 'components.json');
const CONTENT_STATUS_PATH = path.join(MONOREPO_ROOT, 'workplan', 'content-status.json');
const PROGRESS_PATH       = path.join(MONOREPO_ROOT, 'workplan', 'progress.json');
const ADR_DIR             = path.join(MONOREPO_ROOT, 'workplan', 'adr');

// ─── Private helpers ─────────────────────────────────────────────────────────

function parseFrontmatter(content: string): { meta: Partial<ADRMeta>; body: string } {
  const parts = content.split(/^---\s*$/m);

  // Expect: ['', frontmatter, body] or just ['content'] when no frontmatter
  if (parts.length < 3) {
    return { meta: {}, body: content.trim() };
  }

  const yamlBlock = parts[1];
  const body = parts.slice(2).join('---').trim();
  const meta: Partial<ADRMeta> = {};

  const lines = yamlBlock.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^(\w[\w-]*):\s*(.*)/);

    if (match) {
      const key = match[1] as string;
      const value = match[2].trim().replace(/^['"](.+)['"]$/, '$1');

      if (value === '') {
        // Multi-line list — read following '  - item' lines
        const items: string[] = [];
        i++;
        while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s+-\s+/, '').trim());
          i++;
        }

        switch (key) {
          case 'relatedADRs': { meta.relatedADRs = items; break; }
          case 'deciders': { meta.deciders = items; break; }
          case 'tags': { meta.tags = items; break; }
          default: { break; }
        }

        continue;
      }

      switch (key) {
        case 'id': { meta.id = value; break; }
        case 'title': { meta.title = value; break; }
        case 'status': { meta.status = value as ADRMeta['status']; break; }
        case 'date': { meta.date = value; break; }
        case 'version': { meta.version = Number(value); break; }
        case 'category': { meta.category = value; break; }
        default: { break; }
      }
    }

    i++;
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
  return readJson<Project>(PHASES_PATH);
}

/** Reads workplan/components.json. Returns null when the file is missing. */
export async function getComponents(): Promise<ComponentSummary[] | null> {
  return readJson<ComponentSummary[]>(COMPONENTS_PATH);
}

/** Reads workplan/content-status.json. Returns null when the file is missing. */
export async function getContentStatus(): Promise<ContentStatus | null> {
  return readJson<ContentStatus>(CONTENT_STATUS_PATH);
}

/** Reads workplan/progress.json. Returns null when the file is missing. */
export async function getProgress(): Promise<ProgressData | null> {
  return readJson<ProgressData>(PROGRESS_PATH);
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

const PRIMITIVE_KEYWORDS = ['primitive', 'token', 'atom', 'color', 'font', 'spacing', 'icon'];
const DOMAIN_KEYWORDS = [
  'domain', 'button', 'badge', 'input', 'card', 'modal', 'select', 'checkbox', 'progress',
];

/**
 * Buckets components from components.json into three design-system layers and
 * returns LayerRow[] with completion counts. Returns null when the file is missing.
 */
export async function getDesignSystemLayers(): Promise<LayerRow[] | null> {
  const data = await readJson<{ components: ComponentSummary[] }>(COMPONENTS_PATH);
  const components = data?.components;
  if (!components) return null;

  const buckets: Record<LayerName, ComponentSummary[]> = {
    Primitives: [],
    Domain:     [],
    Layouts:    [],
  };

  for (const comp of components) {
    const lower = comp.name.toLowerCase();
    if (PRIMITIVE_KEYWORDS.some((kw) => lower.includes(kw))) {
      buckets.Primitives.push(comp);
    } else if (DOMAIN_KEYWORDS.some((kw) => lower.includes(kw))) {
      buckets.Domain.push(comp);
    } else {
      buckets.Layouts.push(comp);
    }
  }

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
