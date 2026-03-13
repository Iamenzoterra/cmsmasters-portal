import fs from 'fs/promises';
import path from 'path';

import type {
  Project,
  ComponentSummary,
  ContentStatus,
  ProgressData,
  ADRMeta,
  ADRMetaWithBody,
  InfraItem,
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

        if (key === 'relatedADRs') meta.relatedADRs = items;
        else if (key === 'deciders') meta.deciders = items;
        else if (key === 'tags') meta.tags = items;

        continue;
      }

      switch (key) {
        case 'id':       meta.id       = value; break;
        case 'title':    meta.title    = value; break;
        case 'status':   meta.status   = value as ADRMeta['status']; break;
        case 'date':     meta.date     = value; break;
        case 'version':  meta.version  = Number(value); break;
        case 'category': meta.category = value; break;
        default: break;
      }
    }

    i++;
  }

  return { meta, body };
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
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
        const content = await fs.readFile(path.join(ADR_DIR, filename), 'utf-8');
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
      const content = await fs.readFile(path.join(ADR_DIR, filename), 'utf-8');
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
